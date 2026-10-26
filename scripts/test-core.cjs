const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
// Compile only the pure modules in memory: no test framework or native mocks.
const loaded = new Map();
function load(file) {
  file = path.resolve(file);
  if (loaded.has(file)) return loaded.get(file).exports;
  const module = { exports: {} }; loaded.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = name => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name);
  new Function('require', 'module', 'exports', js)(localRequire, module, module.exports);
  return module.exports;
}
const rules = load('src/utils/rules.ts');
const { createSynchronizer } = load('src/services/syncEngine.ts');
const { migrationV1 } = load('src/database/schema.ts');
const meter = { id: '1', codigo: 'MED-000001', direccion: 'A', sector: 'N', numeroCuenta: 'C', estado: 'normal', ultimaLectura: 100, fechaUltimaLectura: '2020-01-01T00:00:00Z', consumoPromedioMensual: 10 };
let tests = 0;
function test(name, fn) { fn(); tests++; console.log(`✓ ${name}`); }
test('formato estricto, sin coincidencias parciales', () => {
  assert(rules.validCode('MED-000123'));
  for (const v of ['MED-123', '123456', 'MED-ABC123', 'MED-0001234', ' MED-000123']) assert(!rules.validCode(v));
});
test('triple estricto, cero, desconocido y negativo', () => {
  assert(!rules.consumption(130, meter).anomalous);
  assert(rules.consumption(130.001, meter).anomalous);
  assert(rules.consumption(99, meter).inconsistent);
  assert.equal(rules.consumption(120, null).value, null);
  assert(rules.consumption(101, { ...meter, consumoPromedioMensual: 0 }).anomalous);
  assert.equal(rules.consumption(null, meter).value, null);
});
const draft = { ...rules.newDraft('EMP-001', 'stable-id'), codigoMedidor: meter.codigo, lectura: '120', meter };
test('normal requerido, inaccesible sin lectura y dañado con foto', () => {
  assert.deepEqual(rules.validateDraft(draft), {});
  assert(rules.validateDraft({ ...draft, lectura: '' }).lectura);
  const inaccessible = { ...draft, estadoMedidor: 'inaccesible', motivo: 'Cerrado', lectura: 'abc' };
  assert.equal(rules.toLocal(inaccessible).lecturaActual, null);
  assert.deepEqual(rules.validateDraft(inaccessible), {});
  assert(rules.validateDraft({ ...draft, estadoMedidor: 'dañado', danio: 'Roto', lectura: '' }).photoUri);
  assert.deepEqual(rules.validateDraft({ ...draft, estadoMedidor: 'dañado', danio: 'Roto', lectura: '', photoUri: 'file://evidence' }), {});
});
test('anomalía necesita confirmación y foto, incluso al guardar', () => {
  const a = { ...draft, lectura: '131' };
  assert(rules.validateDraft(a).photoUri);
  assert(rules.validateDraft(a).confirmacionAnomalia);
  assert.deepEqual(rules.validateDraft({ ...a, photoUri: 'file://evidence', confirmacionAnomalia: true }), {});
});
test('rechaza NaN, negativos, exponentes y fecha futura', () => {
  for (const lectura of ['NaN', '-1', '1e3', '1.0001', 'Infinity']) assert(rules.validateDraft({ ...draft, lectura }).lectura);
  assert(!rules.validVisit('2999-01-01'));
  assert(!rules.validVisit('2026-02-30'));
  assert.equal(rules.periodOf('2026-10-01'), '2026-10');
});
test('offline sin inventar datos y payload sin URI privada', () => {
  const r = rules.toLocal({ ...draft, meter: null });
  assert.equal(r.status, 'pending_verification'); assert.equal(r.lecturaAnterior, null);
  const payload = rules.remotePayload(r); assert(!('status' in payload)); assert(!('photoUri' in payload)); assert.equal(payload.fotoUrl, null);
});
test('migración SQLite real: unicidad mensual y estado restringido', () => {
  const db = new DatabaseSync(':memory:'); db.exec(migrationV1);
  const insert = db.prepare('INSERT INTO readings(clientId,codigo,periodo,employee,status,data) VALUES(?,?,?,?,?,?)');
  insert.run('1', 'MED-000001', '2026-10', 'EMP-001', 'pending_sync', '{}');
  assert.throws(() => insert.run('2', 'MED-000001', '2026-10', 'EMP-001', 'pending_sync', '{}'), /UNIQUE/);
  insert.run('3', 'MED-000001', '2026-11', 'EMP-001', 'pending_sync', '{}');
  assert.throws(() => insert.run('4', 'MED-000002', '2026-10', 'EMP-001', 'bad', '{}'), /CHECK/);
  db.exec(migrationV1); assert.equal(db.prepare('SELECT count(*) as n FROM readings').get().n, 2); db.close();
});
async function syncTests() {
  let saved = rules.toLocal(draft), posts = 0, clients = [], logical = [], timeout = false;
  const ports = {
    list: async () => [saved], claim: async () => ['sent','conflict'].includes(saved.status) ? null : structuredClone(saved),
    write: async r => { saved = structuredClone(r); }, meter: async () => meter,
    client: async () => clients, logical: async () => logical, photo: () => true,
    post: async payload => { posts++; if (timeout) throw new Error('timeout'); return { ...payload, id: 'remote-1' }; },
    online: () => true, changed: () => {},
  };
  let sync = createSynchronizer(ports);
  await Promise.all([sync.run('EMP-001'), sync.run('EMP-001'), sync.run('EMP-001')]);
  assert.equal(posts, 1); assert.equal(saved.status, 'sent');
  console.log('✓ mutex: disparadores concurrentes generan un solo POST'); tests++;
  saved = rules.toLocal(draft); timeout = true; posts = 0;
  await sync.run('EMP-001'); assert.equal(saved.status, 'unknown_remote_result');
  saved.nextAttempt = 0; await sync.run('EMP-001'); assert.equal(posts, 1); assert.equal(saved.status, 'unknown_remote_result');
  clients = [{ ...rules.remotePayload(saved), id: 'confirmed' }]; saved.nextAttempt = 0;
  await sync.run('EMP-001'); assert.equal(saved.status, 'sent'); assert.equal(saved.id, 'confirmed'); assert.equal(posts, 1);
  console.log('✓ timeout ambiguo: GET vacío no repite POST y coincidencia reconcilia'); tests++;
  clients = []; timeout = false; saved = rules.toLocal(draft); posts = 0;
  logical = [{ ...rules.remotePayload(saved), clientId: 'other', id: 'existing' }];
  await sync.run('EMP-001'); assert.equal(saved.status, 'conflict'); assert.equal(posts, 0);
  console.log('✓ identidad remota del mismo mes bloquea nueva creación'); tests++;
  logical = []; saved = rules.toLocal({ ...draft, meter: null, lectura: '131' });
  await sync.run('EMP-001'); assert.equal(saved.status, 'pending_verification'); assert.equal(saved.consumoAnomalo, true); assert.equal(posts, 0);
  console.log('✓ anomalía descubierta al reconectar espera confirmación humana'); tests++;
  saved = rules.toLocal(draft); clients = [{ ...rules.remotePayload(saved), clientId: 'stable-id-partial', id: 'partial' }];
  logical = [{ ...rules.remotePayload(saved), periodo: '2026-01', id: 'unrelated' }];
  await sync.run('EMP-001'); assert.equal(posts, 1); assert.equal(saved.status, 'sent');
  console.log('✓ coincidencias parciales de filtros no reconcilian otra lectura'); tests++;
  saved = rules.toLocal({ ...draft, estadoMedidor: 'dañado', danio: 'Roto', photoUri: 'file://missing' });
  sync = createSynchronizer({ ...ports, photo: () => false }); posts = 0;
  await sync.run('EMP-001'); assert.equal(saved.status, 'pending_verification'); assert.equal(posts, 0);
  console.log('✓ fotografía obligatoria ausente bloquea envío'); tests++;
  saved = rules.toLocal({ ...draft, photoUri: 'file://missing-optional' });
  await sync.run('EMP-001'); assert.equal(saved.status, 'pending_verification'); assert.equal(posts, 0);
  console.log('✓ evidencia opcional asociada pero perdida no se declara conservada'); tests++;
  saved = rules.toLocal(draft); clients = []; logical = [];
  sync = createSynchronizer({ ...ports, meter: async () => null });
  await sync.run('EMP-001'); assert.equal(saved.status, 'pending_verification'); assert.equal(posts, 0);
  console.log('✓ medidor remoto ausente se conserva pendiente, sin datos ficticios'); tests++;
  saved = rules.toLocal(draft);
  sync = createSynchronizer({ ...ports, meter: async () => ({ ...meter, fechaUltimaLectura: '2999-01-01T00:00:00Z' }) });
  await sync.run('EMP-001'); assert.equal(saved.status, 'pending_verification'); assert.equal(posts, 0);
  console.log('✓ base de lectura posterior a visita bloquea cálculo histórico'); tests++;
  saved = rules.toLocal(draft);
  sync = createSynchronizer({ ...ports, online: () => false });
  await sync.run('EMP-001'); assert.equal(posts, 0); assert.equal(saved.status, 'pending_sync');
  console.log('✓ sin conexión no se reclama ni envía una lectura'); tests++;
  process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
  const apiModule = load('src/services/api.ts');
  let requests = 0;
  apiModule.api.defaults.adapter = async config => {
    requests++;
    return { data: [{ ...meter, codigo: 'MED-000001-partial' }, meter], status: 200, statusText: 'OK', headers: {}, config };
  };
  await assert.rejects(apiModule.fetchMeter('MED-123'), /inválido/);
  assert.equal(requests, 0);
  const found = await apiModule.fetchMeter('MED-000001'); assert.equal(found.codigo, 'MED-000001'); assert.equal(requests, 1);
  console.log('✓ frontera Axios valida antes de solicitar y filtra código exacto'); tests++;
  console.log(`\n${tests} comprobaciones correctas.`);
}
syncTests().catch(error => { console.error(error); process.exitCode = 1; });
