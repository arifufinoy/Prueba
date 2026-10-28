import type { LocalReading, Meter, Reading } from '../types/domain';
import { consumption, fromLocal, localDate, remotePayload, validateDraft } from '../utils/rules';

export interface SyncPorts {
  list(): Promise<LocalReading[]>;
  claim(id: string): Promise<LocalReading | null>;
  release?(id: string): void;
  write(r: LocalReading): Promise<void>;
  meter(code: string): Promise<Meter | null>;
  client(id: string): Promise<Reading[]>;
  logical(code: string, period: string): Promise<Reading[]>;
  post(payload: ReturnType<typeof remotePayload>): Promise<Reading>;
  update(id: string, payload: ReturnType<typeof remotePayload>): Promise<Reading>;
  photo(uri: string | null): boolean;
  online(): boolean;
  changed(): void;
}
const sameIdentity = (a: Reading, b: Reading) => !!a.id && a.clientId === b.clientId && a.codigoMedidor === b.codigoMedidor && a.periodo === b.periodo;

export function createSynchronizer(ports: SyncPorts) {
  let running = false;
  async function process(r: LocalReading) {
    const uncertain = r.status === 'unknown_remote_result';
    let requestStarted = false;
    try {
      const matches = (await ports.client(r.clientId)).filter(x => x.clientId === r.clientId);
      if (matches.length > 1) {
        r.status = 'conflict'; r.error = 'Hay varios registros remotos con este clientId. Se requiere revisión.'; return;
      }
      const remote = matches[0];
      if (remote && (!sameIdentity(remote, r) || (r.id && remote.id !== r.id))) {
        r.status = 'conflict'; r.error = 'El clientId remoto corresponde a otro medidor o período.'; return;
      }
      if (r.workflow === 'pending') {
        const duplicates = (await ports.logical(r.codigoMedidor, r.periodo)).filter(x => x.clientId !== r.clientId && x.codigoMedidor === r.codigoMedidor && x.periodo === r.periodo);
        if (duplicates.length) { r.status = 'conflict'; r.error = 'Ya existe otro registro para este medidor y mes.'; return; }
        const issues = validateDraft(fromLocal(r), 1);
        if (Object.keys(issues).length) { r.status = 'error'; r.error = Object.values(issues).join(' '); return; }
        if (!remote && r.id) { r.status = 'conflict'; r.error = 'El registro remoto ya no existe.'; return; }
        if (!ports.online()) return;
        // Reconcile an uncertain creation before any new mutation. Pending
        // metadata edits use PUT on the same ID, never a second POST.
        if (remote && (!r.id || (uncertain && remote.fechaVisita === r.fechaVisita))) {
          r.id = remote.id;
        } else {
          r.status = 'sending'; r.attempts++; await ports.write(r); requestStarted = true;
          const response = r.id ? await ports.update(r.id, remotePayload(r)) : await ports.post(remotePayload(r));
          if (!sameIdentity(response, r) || (r.id && response.id !== r.id)) throw new Error('La respuesta no confirma el registro pendiente.');
          r.id = response.id;
        }
        r.status = 'sent'; r.verificacionPendiente = false; r.error = null;
        r.fechaSincronizacion = new Date().toISOString(); r.nextAttempt = 0; return;
      }
      if (remote && (!r.id || !r.verificacionPendiente)) {
        // Reconcile a successful/ambiguous creation without another POST.
        r.id = remote.id; r.status = 'sent'; r.error = null;
        // A POST may have succeeded with incomplete baseline. Retain the local
        // verification flag even if the server strips unknown fields.
        r.verificacionPendiente = Boolean(r.verificacionPendiente || remote.verificacionPendiente);
        r.fechaSincronizacion = new Date().toISOString(); r.nextAttempt = Date.now() + 60000; return;
      }
      if (!remote && r.id) {
        r.status = 'conflict';
        r.error = 'El registro remoto ya no existe. No se creará un duplicado automáticamente.';
        return;
      }
      // R9: an interrupted creation is retried only after this GET has confirmed
      // that no remote row already has the same stable clientId. Reusing that
      // identity lets a later GET reconcile a response that was lost.
      if (!remote && uncertain) {
        r.status = 'pending_sync'; r.error = null; r.nextAttempt = 0;
      }
      const existing = (await ports.logical(r.codigoMedidor, r.periodo)).filter(x => x.codigoMedidor === r.codigoMedidor && x.periodo === r.periodo && x.clientId !== r.clientId);
      if (existing.length) {
        r.status = 'conflict'; r.error = 'Ya existe otra lectura remota para este medidor y mes.'; return;
      }
      const meter = await ports.meter(r.codigoMedidor);
      if (!meter && r.id && (r.workflow !== 'reviewed' || remote?.workflow === 'reviewed')) {
        // Already received remotely; keep checking for a baseline, not reposting.
        r.status = 'sent'; r.verificacionPendiente = true; r.error = null;
        r.nextAttempt = Date.now() + 60000; return;
      }
      const previous = r.lecturaAnterior;
      r.meter = meter;
      const check = consumption(r.lecturaActual, meter);
      if (previous !== check.previous) r.confirmacionAnomalia = false;
      r.lecturaAnterior = check.previous; r.consumoCalculado = check.value; r.consumoAnomalo = check.anomalous;
      const draft = fromLocal(r);
      const missingPhoto = !!r.photoUri && !ports.photo(r.photoUri);
      const photoRequired = r.estadoMedidor === 'dañado' || check.anomalous;
      if (missingPhoto) {
        draft.photoUri = null;
        if (!photoRequired) { r.photoUri = null; r.tieneFoto = false; }
      }
      const errors = validateDraft(draft);
      if (missingPhoto && photoRequired) errors.photoUri = 'La foto obligatoria no está disponible. Captura otra antes de enviar.';
      if (meter && localDate(new Date(meter.fechaUltimaLectura)) > r.fechaVisita) errors.fechaVisita = 'El dato previo es posterior a la visita. Revisa la fecha.';
      if (Object.keys(errors).length) {
        r.status = 'pending_verification'; r.error = Object.values(errors).join(' ');
        r.nextAttempt = Date.now() + 60000; return;
      }
      if (!ports.online()) { r.status = 'pending_sync'; return; }
      // Preserve true locally until PUT is confirmed, so an interrupted update
      // resumes verification of the SAME remote ID rather than reconciling stale data.
      const needsVerification = !meter;
      if (!r.id) r.verificacionPendiente = needsVerification;
      r.status = 'sending'; r.attempts++;
      await ports.write(r);
      requestStarted = true;
      const payload = { ...remotePayload(r), verificacionPendiente: needsVerification };
      const response = r.id ? await ports.update(r.id, payload) : await ports.post(payload);
      if (!sameIdentity(response, r) || (r.id && response.id !== r.id)) throw new Error('La respuesta remota no confirma el ID, clientId, medidor y período enviados.');
      r.id = response.id; r.status = 'sent'; r.error = null; r.verificacionPendiente = needsVerification;
      r.fechaSincronizacion = new Date().toISOString(); r.nextAttempt = Date.now() + 60000;
    } catch (error) {
      r.status = requestStarted || uncertain ? 'unknown_remote_result' : 'error';
      r.error = error instanceof Error ? error.message : 'No se pudo completar la sincronización.';
      if (!requestStarted) r.attempts++;
      // Reconcile an interrupted request on the next connectivity trigger instead
      // of locking it behind the longer backoff used for plain request errors.
      r.nextAttempt = requestStarted || uncertain ? 0 : Date.now() + Math.min(15 * 60000, 30000 * 2 ** Math.min(r.attempts, 5));
    }
  }
  return {
    get running() { return running; },
    async run(employee: string) {
      if (running || !ports.online()) return;
      running = true; ports.changed();
      try {
        for (const entry of await ports.list()) {
          if (!ports.online()) break;
          if (entry.codigoEmpleado !== employee) continue;
          const r = await ports.claim(entry.clientId);
          if (!r) continue;
          try { await process(r); await ports.write(r); }
          finally { ports.release?.(r.clientId); }
        }
      } finally { running = false; ports.changed(); }
    },
  };
}
