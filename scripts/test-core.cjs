const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
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
const { migrationV1, migrationV2 } = load('src/database/schema.ts');
const { resolveStoredPhoto } = load('src/utils/photoPaths.ts');
const meter = { id: '1', codigo: 'MED-000001', direccion: 'A', sector: 'N', numeroCuenta: 'C', estado: 'normal', ultimaLectura: 100, fechaUltimaLectura: '2020-01-01T00:00:00Z', consumoPromedioMensual: 10 };
const draft = { ...rules.newDraft('EMP-001', 'stable-id'), codigoMedidor: meter.codigo, lectura: '120', meter };
let tests = 0;
async function test(name, fn) { await fn(); tests++; console.log(`✓ ${name}`); }
function harness(input = draft) {
  const state = { local: rules.toLocal(input), remote: [], meter, online: true, photo: true, posts: 0, puts: 0, releases: 0, timeoutPost: false, commitOnTimeout: false, timeoutPut: false };
  const ports = {
    list: async () => [structuredClone(state.local)],
    claim: async () => state.local.status === 'conflict' || (state.local.status === 'sent' && !state.local.verificacionPendiente) ? null : structuredClone(state.local),
    release: () => { state.releases++; },
    write: async r => { state.local = structuredClone(r); },
    meter: async () => state.meter, client: async () => structuredClone(state.remote), logical: async () => structuredClone(state.remote),
    post: async payload => {
      state.posts++; const record = { ...payload, id: 'remote-1' };
      if (!state.timeoutPost || state.commitOnTimeout) state.remote.push(record);
      if (state.timeoutPost) throw new Error('timeout');
      return record;
    },
    update: async (id, payload) => {
      state.puts++; const record = { ...payload, id };
      if (state.timeoutPut) throw new Error('timeout');
      state.remote = state.remote.map(r => r.id === id ? record : r); return record;
    },
    photo: () => state.photo, online: () => state.online, changed: () => {},
  };
  const sync = createSynchronizer(ports);
  return { state, ports, run: () => sync.run('EMP-001'), sync };
}
async function main() {
  await test('alta inicial conserva sólo código y fecha, sin inventar estado ni lectura', () => {
    const r = rules.toPendingRegistration(draft);
    assert.equal(r.workflow, 'pending'); assert.equal(r.estadoMedidor, null);
    assert.equal(r.lecturaActual, null); assert.equal(r.meter, null);
    assert.equal(r.tieneFoto, false); assert.equal(r.verificacionPendiente, false);
    assert.equal(rules.workflowLabel(r), 'En cola');
    assert.deepEqual(rules.validateDraft(rules.fromLocal(r), 1), {});
  });
  await test('sin red queda En cola; al reconectar pasa a Pendiente sin completar automáticamente', async () => {
    const h = harness(); h.state.local = rules.toPendingRegistration(draft); h.state.online = false;
    await h.run(); assert.equal(h.state.posts, 0); assert.equal(rules.workflowLabel(h.state.local), 'En cola');
    h.state.online = true; await h.run();
    assert.equal(h.state.posts, 1); assert.equal(rules.workflowLabel(h.state.local), 'Pendiente');
    assert.equal(h.state.remote[0].estadoMedidor, null); assert.equal(h.state.remote[0].lecturaActual, null);
    h.state.local = JSON.parse(JSON.stringify(h.state.local)); await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 0);
    assert.equal(rules.workflowLabel(h.state.local), 'Pendiente'); assert(rules.canEditReading(h.state.local));
  });
  await test('completar el pendiente actualiza el mismo ID con PUT y queda Revisado', async () => {
    const h = harness(); h.state.local = rules.toPendingRegistration(draft); await h.run();
    const id = h.state.local.id;
    h.state.local = { ...rules.toLocal(draft), id, workflow: 'reviewed', verificacionPendiente: true };
    await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 1); assert.equal(h.state.local.id, id);
    assert.equal(h.state.remote.length, 1); assert.equal(h.state.remote[0].workflow, 'reviewed');
    assert.equal(rules.workflowLabel(h.state.local), 'Revisado'); assert(!rules.canEditReading(h.state.local));
  });
  await test('completar sin catastro también hace PUT del pendiente, nunca otro POST', async () => {
    const h = harness(); h.state.meter = null; h.state.local = rules.toPendingRegistration(draft); await h.run();
    h.state.local = { ...rules.toLocal({ ...draft, meter: null }), id: h.state.local.id, workflow: 'reviewed', verificacionPendiente: true };
    await h.run(); assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 1);
    assert.equal(h.state.remote[0].lecturaActual, 120); assert.equal(h.state.remote[0].workflow, 'reviewed');
    await h.run(); assert.equal(h.state.puts, 1);
  });
  await test('alta interrumpida se reconcilia como Pendiente sin duplicar', async () => {
    const h = harness(); h.state.local = rules.toPendingRegistration(draft);
    h.state.timeoutPost = true; h.state.commitOnTimeout = true;
    await h.run(); assert.equal(rules.workflowLabel(h.state.local), 'En cola');
    h.state.timeoutPost = false; await h.run();
    assert.equal(h.state.posts, 1); assert.equal(rules.workflowLabel(h.state.local), 'Pendiente');
  });
  await test('alta inicial respeta duplicado remoto mensual', async () => {
    const h = harness(); h.state.local = rules.toPendingRegistration(draft);
    h.state.remote = [{ ...rules.remotePayload(h.state.local), clientId: 'another', id: 'other' }];
    await h.run(); assert.equal(h.state.posts, 0); assert.equal(h.state.local.status, 'conflict');
  });
  await test('editar fecha del pendiente usa PUT del registro existente', async () => {
    const h = harness(); h.state.local = rules.toPendingRegistration(draft); await h.run();
    h.state.local.fechaVisita = `${h.state.local.periodo}-01`; h.state.local.status = 'pending_sync';
    await h.run(); assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 1);
    assert.equal(h.state.remote[0].fechaVisita, h.state.local.fechaVisita);
  });
  await test('revisión completada offline se conserva y se actualiza al reconectar', async () => {
    const h = harness(); h.state.local = rules.toPendingRegistration(draft); await h.run();
    h.state.local = { ...rules.toLocal(draft), id: h.state.local.id, workflow: 'reviewed', verificacionPendiente: true };
    h.state.online = false; await h.run();
    assert.equal(h.state.puts, 0); assert.equal(rules.workflowLabel(h.state.local), 'Revisado');
    h.state.online = true; await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 1); assert.equal(h.state.local.status, 'sent');
  });
  await test('no se envía revisión normal incompleta: lectura obligatoria', async () => {
    const h = harness(); h.state.local = rules.toPendingRegistration(draft); await h.run();
    h.state.local = { ...rules.toLocal({ ...draft, lectura: '' }), id: h.state.local.id, workflow: 'reviewed', verificacionPendiente: true };
    await h.run(); assert.equal(h.state.puts, 0); assert.equal(h.state.posts, 1);
    assert.match(h.state.local.error, /obligatoria/);
  });
  await test('PUT pendiente interrumpido no reconcilia una fecha remota obsoleta', async () => {
    const h = harness(); h.state.local = rules.toPendingRegistration(draft); await h.run();
    h.state.local.fechaVisita = `${h.state.local.periodo}-01`; h.state.local.status = 'pending_sync'; h.state.timeoutPut = true;
    await h.run(); assert.equal(h.state.local.status, 'unknown_remote_result');
    h.state.timeoutPut = false; await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 2);
    assert.equal(h.state.remote[0].fechaVisita, h.state.local.fechaVisita);
  });
  await test('código estricto', () => {
    assert(rules.validCode('MED-000123'));
    for (const v of ['MED-123','123456','MED-ABC123','MED-0001234',' MED-000123']) assert(!rules.validCode(v));
    assert(!rules.mayShowMeterResults(''));
    assert(rules.mayShowMeterResults('MED-000123'));
    assert(!rules.mayShowMeterResults('MED-123'));
    assert(!rules.mayShowMeterResults('MED-ABC123'));
  });
  await test('triple estricto, promedio cero y anterior desconocido', () => {
    assert(!rules.consumption(130, meter).anomalous); assert(rules.consumption(130.001, meter).anomalous);
    assert(rules.consumption(99, meter).inconsistent); assert.equal(rules.consumption(120, null).value, null);
    assert(rules.consumption(101, { ...meter, consumoPromedioMensual: 0 }).anomalous);
  });
  await test('validaciones condicionales y ausencia de consumo negativo', () => {
    assert.deepEqual(rules.validateDraft(draft), {});
    assert(rules.validateDraft({ ...draft, lectura: '' }).lectura);
    assert.equal(rules.toLocal({ ...draft, estadoMedidor: 'inaccesible', motivo: 'Cerrado', lectura: '99' }).lecturaActual, null);
    assert(rules.validateDraft({ ...draft, estadoMedidor: 'dañado', danio: 'Roto', lectura: '' }).photoUri);
    assert(rules.validateDraft({ ...draft, lectura: '99' }).lectura);
    for (const lectura of ['NaN','-1','1e3','1.0001','Infinity']) assert(rules.validateDraft({ ...draft, lectura }).lectura);
  });
  await test('anomalía requiere foto y confirmación', () => {
    const a = { ...draft, lectura: '131' };
    assert(rules.validateDraft(a).photoUri); assert(rules.validateDraft(a).confirmacionAnomalia);
    assert.deepEqual(rules.validateDraft({ ...a, photoUri: 'file://evidence', confirmacionAnomalia: true }), {});
  });
  await test('fecha local y rechazo de fechas futuras/inexistentes', () => {
    assert(!rules.validVisit('2999-01-01')); assert(!rules.validVisit('2026-02-30'));
    assert.equal(rules.periodOf('2026-10-01'), '2026-10');
  });
  await test('SQLite v1→v2 conserva lecturas, unicidad y tabla reservada', () => {
    const db = new DatabaseSync(':memory:'); db.exec(migrationV1);
    const insert = db.prepare('INSERT INTO readings(clientId,codigo,periodo,employee,status,data) VALUES(?,?,?,?,?,?)');
    insert.run('1','MED-000001','2026-10','EMP-001','pending_sync','{}');
    assert.throws(() => insert.run('2','MED-000001','2026-10','EMP-001','pending_sync','{}'), /UNIQUE/);
    assert.throws(() => insert.run('3','MED-000002','2026-10','EMP-001','bad','{}'), /CHECK/);
    db.exec(migrationV2); db.exec(migrationV2);
    db.prepare('INSERT INTO remote_snapshots(resource,data) VALUES(?,?)').run('lecturas', JSON.stringify([{ id: 'other' }]));
    assert.equal(db.prepare('SELECT count(*) n FROM readings').get().n, 1);
    assert.equal(JSON.parse(db.prepare('SELECT data FROM remote_snapshots').get().data)[0].id, 'other');
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 2); db.close();
  });
  await test('payload no filtra URI privada ni estado de cola', () => {
    const r = rules.toLocal({ ...draft, meter: null });
    assert.equal(r.status, 'pending_verification'); assert(r.verificacionPendiente); assert.equal(r.lecturaAnterior, null);
    const payload = rules.remotePayload(r); assert(!('photoUri' in payload)); assert(!('status' in payload));
  });
  await test('sin conexión no envía', async () => {
    const h = harness(); h.state.online = false; await h.run(); assert.equal(h.state.posts, 0);
  });
  await test('visita de medidor desconocido queda marcada pendiente de verificación sin conexión y se envía al volver', async () => {
    const h = harness({ ...draft, meter: null }); h.state.online = false; h.state.meter = null;
    assert.equal(h.state.local.status, 'pending_verification');
    await h.run(); assert.equal(h.state.posts, 0);
    h.state.online = true; await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.local.status, 'sent');
    assert.equal(h.state.local.lecturaAnterior, null);
  });
  await test('mutex: tres disparadores sólo crean un POST', async () => {
    const h = harness(); await Promise.all([h.run(), h.run(), h.run()]); assert.equal(h.state.posts, 1); assert.equal(h.state.local.status, 'sent'); assert.equal(h.state.releases, 1);
  });
  await test('primera visita sin medidor ni lecturas se crea en remoto con valores null', async () => {
    const h = harness({ ...draft, meter: null }); h.state.meter = null; await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.local.status, 'sent'); assert(h.state.local.verificacionPendiente);
    assert.equal(h.state.remote[0].lecturaAnterior, null); assert.equal(h.state.remote[0].consumoCalculado, null);
    await h.run(); assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 0);
  });
  await test('dato previo posterior completa el mismo ID con PUT, nunca segundo POST', async () => {
    const h = harness({ ...draft, meter: null }); h.state.meter = null; await h.run();
    h.state.meter = meter; await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 1); assert.equal(h.state.remote.length, 1);
    assert.equal(h.state.local.verificacionPendiente, false); assert.equal(h.state.local.consumoCalculado, 20);
  });
  await test('anomalía conocida bloquea primer POST sin foto/revisión', async () => {
    const h = harness({ ...draft, lectura: '131' }); await h.run();
    assert.equal(h.state.posts, 0); assert.equal(h.state.local.status, 'pending_verification');
  });
  await test('anomalía descubierta después de recibir visita exige revisión y luego PUT', async () => {
    const h = harness({ ...draft, lectura: '131', meter: null }); h.state.meter = null; await h.run();
    h.state.meter = meter; await h.run();
    assert.equal(h.state.local.status, 'pending_verification'); assert.equal(h.state.puts, 0);
    h.state.local.photoUri = 'file://valid'; h.state.local.confirmacionAnomalia = true; await h.run();
    assert.equal(h.state.local.status, 'sent'); assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 1);
  });
  await test('timeout POST sin resultado se reintenta sólo tras GET que confirma ausencia', async () => {
    const h = harness(); h.state.timeoutPost = true; await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.local.status, 'unknown_remote_result');
    h.state.timeoutPost = false; await h.run();
    assert.equal(h.state.posts, 2); assert.equal(h.state.local.status, 'sent');
    assert.equal(h.state.remote.length, 1);
    assert.equal(h.state.remote[0].clientId, h.state.local.clientId);
  });
  await test('timeout POST confirmado por GET reconcilia sin duplicar', async () => {
    const h = harness(); h.state.timeoutPost = true; h.state.commitOnTimeout = true; await h.run(); await h.run();
    assert.equal(h.state.posts, 1); assert.equal(h.state.local.status, 'sent'); assert.equal(h.state.local.id, 'remote-1');
  });
  await test('timeout PUT sólo actualiza mismo ID al reintentar', async () => {
    const h = harness({ ...draft, meter: null }); h.state.meter = null; await h.run();
    h.state.meter = meter; h.state.timeoutPut = true; await h.run();
    assert.equal(h.state.local.status, 'unknown_remote_result'); h.state.timeoutPut = false; await h.run();
    assert.equal(h.state.local.status, 'sent'); assert.equal(h.state.posts, 1); assert.equal(h.state.puts, 2); assert.equal(h.state.remote.length, 1);
  });
  await test('identidad mensual duplicada bloquea creación', async () => {
    const h = harness(); h.state.remote.push({ ...rules.remotePayload(h.state.local), clientId: 'other', id: 'existing' }); await h.run();
    assert.equal(h.state.posts, 0); assert.equal(h.state.local.status, 'conflict');
  });
  await test('foto opcional desaparecida no bloquea registro normal ni se declara como evidencia', async () => {
    const h = harness({ ...draft, photoUri: 'file://lost' }); h.state.photo = false; await h.run();
    assert.equal(h.state.local.status, 'sent'); assert.equal(h.state.posts, 1);
    assert.equal(h.state.remote[0].tieneFoto, false); assert.equal(h.state.remote[0].fotoUrl, null);
  });
  await test('foto obligatoria perdida bloquea y mantiene lectura corregible', async () => {
    const h = harness({ ...draft, estadoMedidor: 'dañado', danio: 'Roto', photoUri: 'file://lost' }); h.state.photo = false; await h.run();
    assert.equal(h.state.local.status, 'pending_verification'); assert.equal(h.state.posts, 0);
  });
  await test('foto reubicada en documentos se recupera sin aceptar archivos inexistentes', () => {
    const target = 'file:///new/documents/epmaps-photos/photo.jpg';
    const exists = candidate => candidate === target;
    assert.equal(resolveStoredPhoto('file:///old/documents/epmaps-photos/photo.jpg', 'file:///new/documents/', exists), target);
    assert.equal(resolveStoredPhoto('file:///old/documents/epmaps-photos/lost.jpg', 'file:///new/documents/', exists), null);
    assert.equal(resolveStoredPhoto('file:///old/elsewhere/photo.jpg', 'file:///new/documents/', exists), null);
  });
  await test('consulta local de identidad mensual excluye el registro en edición', () => {
    const db = new DatabaseSync(':memory:'); db.exec(migrationV1);
    const insert = db.prepare('INSERT INTO readings(clientId,codigo,periodo,employee,status,data) VALUES(?,?,?,?,?,?)');
    insert.run('self','MED-000001','2026-10','EMP-001','pending_sync','{}');
    insert.run('other','MED-000001','2026-11','EMP-001','pending_sync','{}');
    assert.equal(db.prepare('SELECT clientId FROM readings WHERE codigo=? AND periodo=? AND clientId<>? LIMIT 1').get('MED-000001','2026-10','self'), undefined);
    assert.equal(db.prepare('SELECT clientId FROM readings WHERE codigo=? AND periodo=? AND clientId<>? LIMIT 1').get('MED-000001','2026-10','new').clientId, 'self');
    db.close();
  });
  process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
  const apiModule = load('src/services/api.ts');
  const { AxiosError } = require('axios');
  const records = []; let requests = 0;
  apiModule.api.defaults.adapter = async config => {
    requests++; const response = data => ({ data, status: 200, statusText: 'OK', headers: {}, config });
    if (config.method === 'post') { const r = { ...JSON.parse(config.data), id: String(records.length + 1) }; records.push(r); return response(r); }
    if (config.url === '/medidores') {
      if (config.params) throw new AxiosError('Not found', 'ERR_BAD_REQUEST', config, undefined, { ...response('Not found'), status: 404 });
      return response([]);
    }
    return response(records);
  };
  await test('Axios valida antes de red y maneja 404 de filtro vacío sin bloquear primera visita', async () => {
    await assert.rejects(apiModule.fetchMeter('MED-123'), /inválido/); assert.equal(requests, 0);
    await assert.rejects(apiModule.findLogical('MED-123', '2026-10'), /inválido/); assert.equal(requests, 0);
    const h = harness({ ...draft, meter: null });
    const sync = createSynchronizer({ ...h.ports, meter: apiModule.fetchMeter, client: apiModule.findClient, logical: apiModule.findLogical, post: async body => (await apiModule.api.post('/lecturas', body)).data });
    await sync.run('EMP-001'); assert.equal(records.length, 1); assert.equal(h.state.local.status, 'sent'); assert.equal(records[0].lecturaAnterior, null);
  });
  await test('fecha repetida y otra fecha del mismo mes tienen avisos distintos', () => {
    assert.match(rules.duplicateVisitMessage('2026-10-15', '2026-10-15'), /misma|con la fecha 2026-10-15/);
    assert.match(rules.duplicateVisitMessage('2026-10-16', '2026-10-15'), /una lectura por mes/);
  });
  await test('no quedan herramientas de siembra ni diagnóstico en pantallas', () => {
    assert(!fs.existsSync('src/components/ApiSetupCard.tsx')); assert(!fs.existsSync('src/services/apiSetup.ts'));
    assert(!fs.readFileSync('src/app/profile.tsx', 'utf8').includes('ApiSetupCard'));
    assert(!fs.readFileSync('src/app/pending.tsx', 'utf8').includes('Comprobar API'));
  });
  console.log(`\n${tests} comprobaciones correctas (sin POST reales).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
