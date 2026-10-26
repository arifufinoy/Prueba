import type { LocalReading, Meter, Reading } from '../types/domain';
import { consumption, fromLocal, localDate, remotePayload, validateDraft } from '../utils/rules';

export interface SyncPorts {
  list(): Promise<LocalReading[]>;
  claim(id: string): Promise<LocalReading | null>;
  write(r: LocalReading): Promise<void>;
  meter(code: string): Promise<Meter | null>;
  client(id: string): Promise<Reading[]>;
  logical(code: string, period: string): Promise<Reading[]>;
  post(payload: ReturnType<typeof remotePayload>): Promise<Reading>;
  photo(uri: string | null): boolean;
  online(): boolean;
  changed(): void;
}
export function createSynchronizer(ports: SyncPorts) {
  let running = false;
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
          const uncertain = r.status === 'unknown_remote_result';
          let postStarted = false;
          try {
            const matches = (await ports.client(r.clientId)).filter(x => x.clientId === r.clientId);
            if (matches.length > 1) {
              r.status = 'conflict'; r.error = 'Hay varios registros remotos con este clientId. Se requiere revisión administrativa.';
            } else if (matches.length === 1) {
              const remote = matches[0];
              if (!remote.id || remote.codigoMedidor !== r.codigoMedidor || remote.periodo !== r.periodo) {
                r.status = 'conflict'; r.error = 'El clientId remoto no corresponde al medidor y período locales.';
              } else {
                r.id = remote.id; r.status = 'sent'; r.error = null; r.fechaSincronizacion = new Date().toISOString();
              }
            } else if (uncertain) {
              r.status = 'unknown_remote_result'; r.error = 'Resultado remoto incierto. No se repetirá el POST; se seguirá consultando automáticamente.';
              r.nextAttempt = Date.now() + 60000;
            } else {
              const existing = (await ports.logical(r.codigoMedidor, r.periodo)).filter(x => x.codigoMedidor === r.codigoMedidor && x.periodo === r.periodo);
              if (existing.length) {
                r.status = 'conflict'; r.error = 'Ya existe una lectura remota para este medidor y mes. No se creó otra.';
              } else {
                const meter = await ports.meter(r.codigoMedidor);
                if (!meter) {
                  r.status = 'pending_verification'; r.error = 'El medidor aún no existe en MockAPI. Se volverá a verificar.';
                  r.nextAttempt = Date.now() + 60000;
                } else {
                  const previous = r.lecturaAnterior;
                  r.meter = meter;
                  const check = consumption(r.lecturaActual, meter);
                  // A confirmation belongs to the values actually reviewed.
                  if (previous !== check.previous) r.confirmacionAnomalia = false;
                  r.lecturaAnterior = check.previous; r.consumoCalculado = check.value; r.consumoAnomalo = check.anomalous;
                  const draft = fromLocal(r);
                  const missingPhoto = !!r.photoUri && !ports.photo(r.photoUri);
                  if (missingPhoto) draft.photoUri = null;
                  const errors = validateDraft(draft);
                  if (missingPhoto) errors.photoUri = 'No se encuentra la evidencia local asociada. Reemplázala o quítala si es opcional.';
                  // Old visits must not be calculated against a newer meter baseline.
                  if (localDate(new Date(meter.fechaUltimaLectura)) > r.fechaVisita) errors.fechaVisita = 'La lectura previa remota es posterior a la visita. Revisa el período y los datos.';
                  if (Object.keys(errors).length) {
                    r.status = 'pending_verification'; r.error = Object.values(errors).join(' '); r.nextAttempt = Date.now() + 60000;
                  } else if (ports.online()) {
                    r.status = 'sending'; r.attempts += 1;
                    // Persist intent before HTTP: a process death becomes uncertain.
                    await ports.write(r);
                    postStarted = true;
                    const remote = await ports.post(remotePayload(r));
                    if (!remote.id || remote.clientId !== r.clientId || remote.codigoMedidor !== r.codigoMedidor || remote.periodo !== r.periodo) throw new Error('La respuesta POST no confirma la identidad enviada.');
                    r.id = remote.id; r.status = 'sent'; r.error = null; r.fechaSincronizacion = new Date().toISOString();
                  } else { r.status = 'pending_sync'; }
                }
              }
            }
          } catch (error) {
            r.status = postStarted || uncertain ? 'unknown_remote_result' : 'error';
            r.error = error instanceof Error ? error.message : 'Error de sincronización.';
            r.attempts += postStarted ? 0 : 1;
            r.nextAttempt = Date.now() + Math.min(15 * 60000, 30000 * 2 ** Math.min(r.attempts, 5));
          }
          await ports.write(r);
        }
      } finally { running = false; ports.changed(); }
    },
  };
}
