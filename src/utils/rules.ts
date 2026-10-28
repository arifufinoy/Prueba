import type { Draft, LocalReading, Meter } from '../types/domain';

export const validCode = (code: string) => /^MED-\d{6}$/.test(code);
// R2: no meter data may be requested or displayed without a complete code.
export const mayShowMeterResults = (code: string) => validCode(code);
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const periodOf = (date: string) => date.slice(0, 7);
export function duplicateVisitMessage(date: string, existingDate: string) {
  return date === existingDate
    ? `Este medidor ya tiene un registro con la fecha ${date}. Selecciona un período distinto.`
    : `Este medidor ya tiene un registro en ${periodOf(date)} (fecha ${existingDate}). Sólo se permite una lectura por mes.`;
}
export const parseLocalDate = (date: string) => new Date(`${date}T12:00:00`);
export function validVisit(date: string) {
  const parsed = parseLocalDate(date);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parsed.getTime()) && localDate(parsed) === date && date <= localDate();
}
export function consumption(current: number | null, meter: Meter | null) {
  const previous = meter?.ultimaLectura ?? null;
  const value = current !== null && previous !== null ? current - previous : null;
  return { previous, value, anomalous: value !== null && !!meter && value > meter.consumoPromedioMensual * 3, inconsistent: value !== null && value < 0 };
}
export function currentOf(d: Draft): number | null {
  return d.estadoMedidor === 'inaccesible' || d.lectura.trim() === '' ? null : Number(d.lectura);
}
export function validateDraft(d: Draft, step = 5): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!validCode(d.codigoMedidor)) errors.codigoMedidor = 'Utiliza el formato MED-000001 (seis dígitos).';
  if (!validVisit(d.fechaVisita)) errors.fechaVisita = 'Selecciona una fecha válida que no sea futura.';
  if (step < 3) return errors;
  if (!['normal', 'inaccesible', 'dañado'].includes(d.estadoMedidor)) errors.estadoMedidor = 'Selecciona el estado del medidor.';
  const current = currentOf(d);
  if (d.estadoMedidor === 'normal' && current === null) errors.lectura = 'La lectura actual es obligatoria.';
  if (current !== null && (!Number.isFinite(current) || current < 0 || !/^\d+(\.\d{1,3})?$/.test(d.lectura))) errors.lectura = 'Introduce un número no negativo, con hasta tres decimales.';
  if (d.estadoMedidor === 'inaccesible' && !d.motivo.trim()) errors.motivo = 'Indica el motivo de inaccesibilidad.';
  if (d.estadoMedidor === 'dañado' && !d.danio.trim()) errors.danio = 'Describe el daño observado.';
  const check = consumption(current, d.meter);
  if (check.inconsistent) errors.lectura = 'La lectura es menor que la anterior. Revisa y corrige el valor; no se enviará un consumo negativo.';
  if (step >= 4) {
    if ((d.estadoMedidor === 'dañado' || check.anomalous) && !d.photoUri) errors.photoUri = 'Se requiere una fotografía persistente.';
    if (check.anomalous && !d.confirmacionAnomalia) errors.confirmacionAnomalia = 'Confirma la revisión física del medidor.';
  }
  return errors;
}
export function newDraft(employee: string, clientId: string): Draft {
  return { clientId, codigoEmpleado: employee, codigoMedidor: '', fechaVisita: localDate(), estadoMedidor: 'normal', lectura: '', motivo: '', danio: '', photoUri: null, confirmacionAnomalia: false, meter: null, step: 1, editing: false, identificationOnly: true };
}
export function toLocal(d: Draft): LocalReading {
  const check = consumption(currentOf(d), d.meter);
  return {
    clientId: d.clientId, codigoEmpleado: d.codigoEmpleado, codigoMedidor: d.codigoMedidor,
    periodo: periodOf(d.fechaVisita), fechaVisita: d.fechaVisita, fechaRegistro: new Date().toISOString(),
    estadoMedidor: d.estadoMedidor, lecturaActual: currentOf(d), lecturaAnterior: check.previous,
    consumoCalculado: check.value, consumoAnomalo: check.anomalous, confirmacionAnomalia: check.anomalous && d.confirmacionAnomalia,
    motivoInaccesible: d.estadoMedidor === 'inaccesible' ? d.motivo.trim() : null,
    descripcionDanio: d.estadoMedidor === 'dañado' ? d.danio.trim() : null,
    fotoUrl: null, tieneFoto: !!d.photoUri, photoUri: d.photoUri, meter: d.meter,
    status: d.meter ? 'pending_sync' : 'pending_verification', verificacionPendiente: !d.meter, error: null, attempts: 0, nextAttempt: 0,
  };
}
export function fromLocal(r: LocalReading): Draft {
  return { clientId: r.clientId, codigoEmpleado: r.codigoEmpleado, codigoMedidor: r.codigoMedidor, fechaVisita: r.fechaVisita, estadoMedidor: r.estadoMedidor ?? 'normal', lectura: r.lecturaActual === null ? '' : String(r.lecturaActual), motivo: r.motivoInaccesible ?? '', danio: r.descripcionDanio ?? '', photoUri: r.photoUri, confirmacionAnomalia: r.confirmacionAnomalia, meter: r.meter, step: 3, editing: true, identificationOnly: false };
}
export function toPendingRegistration(d: Draft): LocalReading {
  return { ...toLocal({ ...d, meter: null, lectura: '', photoUri: null }), workflow: 'pending', estadoMedidor: null, lecturaActual: null, lecturaAnterior: null, consumoCalculado: null, consumoAnomalo: false, confirmacionAnomalia: false, motivoInaccesible: null, descripcionDanio: null, status: 'pending_sync', verificacionPendiente: false };
}
export function workflowLabel(r: LocalReading) {
  if (r.workflow === 'pending') return r.status === 'sent' ? 'Pendiente' : 'En cola';
  return 'Revisado';
}
export function canEditReading(r: LocalReading) {
  return editable(r.status) || (r.workflow === 'pending' && r.status === 'sent');
}
export function remotePayload(r: LocalReading) {
  const { status: _status, photoUri: _photo, meter: _meter, error: _error, attempts: _attempts, nextAttempt: _next, id: _id, ...payload } = r;
  return payload;
}
export const editable = (status: LocalReading['status']) => ['pending_sync', 'pending_verification', 'error', 'conflict'].includes(status);
