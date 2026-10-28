import * as SQLite from 'expo-sqlite';
import type { Draft, LocalReading, Meter } from '../types/domain';
import { migrationV1, migrationV2 } from './schema';
import { resolvePhotoUri } from '../services/photos';
import { canEditReading, fromLocal, validateDraft } from '../utils/rules';

let database: Promise<SQLite.SQLiteDatabase> | undefined;
// Leases live only in this JS process; a crash clears them without changing a
// record that has not begun HTTP. The durable `sending` marker is written by
// the synchronizer immediately before the actual POST/PUT.
const claimedReadings = new Set<string>();
const listeners = new Set<() => void>();
export const subscribeData = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const notifyData = () => listeners.forEach(fn => fn());
export function db() {
  database ??= (async () => {
    const connection = await SQLite.openDatabaseAsync('epmaps.db');
    await connection.execAsync('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const version = await connection.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) < 1) await connection.withExclusiveTransactionAsync(async tx => { await tx.execAsync(migrationV1); });
    if ((version?.user_version ?? 0) < 2) await connection.withExclusiveTransactionAsync(async tx => { await tx.execAsync(migrationV2); });
    // A terminated process may have posted successfully. Mark it for a GET check
    // before any retry instead of assuming the request never arrived.
    const sending = await connection.getAllAsync<{ data: string }>("SELECT data FROM readings WHERE status='sending'");
    for (const row of sending) {
      const reading: LocalReading = JSON.parse(row.data);
      reading.status = 'unknown_remote_result'; reading.error = 'Envío interrumpido: comprobando resultado remoto.';
      await connection.runAsync('UPDATE readings SET status=?,data=? WHERE clientId=?', reading.status, JSON.stringify(reading), reading.clientId);
    }
    return connection;
  })();
  return database;
}
export async function cachedMeter(code: string): Promise<Meter | null> {
  const row = await (await db()).getFirstAsync<{ data: string }>('SELECT data FROM meters WHERE codigo=?', code);
  return row ? JSON.parse(row.data) : null;
}
export async function createClientId() {
  const row = await (await db()).getFirstAsync<{ id: string }>('SELECT lower(hex(randomblob(16))) AS id');
  if (!row) throw new Error('No se pudo generar una identidad local.');
  return row.id;
}
export async function cacheMeter(m: Meter) {
  await (await db()).runAsync('INSERT INTO meters(codigo,data,updated) VALUES(?,?,?) ON CONFLICT(codigo) DO UPDATE SET data=excluded.data,updated=excluded.updated', m.codigo, JSON.stringify(m), new Date().toISOString());
}
export async function listReadings(employee?: string): Promise<LocalReading[]> {
  const rows = employee
    ? await (await db()).getAllAsync<{ data: string }>('SELECT data FROM readings WHERE employee=? ORDER BY rowid DESC', employee)
    : await (await db()).getAllAsync<{ data: string }>('SELECT data FROM readings ORDER BY rowid');
  return rows.map(row => hydratePhoto(JSON.parse(row.data)));
}
export async function getReading(clientId: string): Promise<LocalReading | null> {
  const row = await (await db()).getFirstAsync<{ data: string }>('SELECT data FROM readings WHERE clientId=?', clientId);
  return row ? hydratePhoto(JSON.parse(row.data)) : null;
}
export async function findLocalLogical(codigo: string, periodo: string, exceptClientId?: string): Promise<LocalReading | null> {
  const row = await (await db()).getFirstAsync<{ data: string }>('SELECT data FROM readings WHERE codigo=? AND periodo=? AND clientId<>? LIMIT 1', codigo, periodo, exceptClientId ?? '');
  return row ? hydratePhoto(JSON.parse(row.data)) : null;
}
export async function saveReading(r: LocalReading) {
  const issues = validateDraft(fromLocal(r), r.workflow === 'pending' ? 1 : 5);
  if (Object.keys(issues).length) throw new Error(Object.values(issues).join('\n'));
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async tx => {
    const row = await tx.getFirstAsync<{ status: LocalReading['status']; data: string }>('SELECT status,data FROM readings WHERE clientId=?', r.clientId);
    if (claimedReadings.has(r.clientId) || (row && !canEditReading({ ...JSON.parse(row.data), status: row.status }))) throw new Error('El registro está sincronizándose o ya está revisado y enviado.');
    if (row) {
      const previous: LocalReading = JSON.parse(row.data);
      if (previous.codigoMedidor !== r.codigoMedidor || previous.periodo !== r.periodo) throw new Error('El código y mes de un registro existente no se pueden cambiar. Crea otro registro para otro mes.');
      r.fechaRegistro = previous.fechaRegistro;
      r.id = previous.id;
      r.verificacionPendiente = previous.id ? true : r.verificacionPendiente;
      await tx.runAsync('UPDATE readings SET codigo=?,periodo=?,status=?,data=?,attempts=0,nextAttempt=0 WHERE clientId=?', r.codigoMedidor, r.periodo, r.status, JSON.stringify(r), r.clientId);
    } else {
      await tx.runAsync('INSERT INTO readings(clientId,codigo,periodo,employee,status,data) VALUES(?,?,?,?,?,?)', r.clientId, r.codigoMedidor, r.periodo, r.codigoEmpleado, r.status, JSON.stringify(r));
    }
    await tx.runAsync('DELETE FROM drafts WHERE employee=?', r.codigoEmpleado);
  });
  notifyData();
}
export async function writeQueue(r: LocalReading) {
  await (await db()).runAsync('UPDATE readings SET status=?,data=?,attempts=?,nextAttempt=? WHERE clientId=?', r.status, JSON.stringify(r), r.attempts, r.nextAttempt, r.clientId);
  notifyData();
}
export async function claimReading(id: string): Promise<LocalReading | null> {
  const connection = await db(); let result: LocalReading | null = null;
  await connection.withExclusiveTransactionAsync(async tx => {
    if (claimedReadings.has(id)) return;
    const row = await tx.getFirstAsync<{ data: string; status: string }>('SELECT data,status FROM readings WHERE clientId=?', id);
    if (!row) return;
    const r: LocalReading = hydratePhoto(JSON.parse(row.data));
    if (!['pending_sync','pending_verification','error','unknown_remote_result'].includes(row.status) && !(row.status === 'sent' && r.verificacionPendiente)) return;
    if (r.nextAttempt > Date.now()) return;
    // Draft being edited leases the row out of the queue, including across restarts.
    const draft = await tx.getFirstAsync<{ data: string }>('SELECT data FROM drafts WHERE employee=?', r.codigoEmpleado);
    if (draft && (JSON.parse(draft.data) as Draft).clientId === id) return;
    // Do not persist `sending` here: a crash before HTTP would otherwise strand
    // a record as an uncertain POST that never started. The sync engine persists
    // `sending` only immediately before the remote mutation.
    claimedReadings.add(id);
    result = r;
  });
  return result;
}
export function releaseReading(id: string) { claimedReadings.delete(id); }
export async function saveDraft(d: Draft) {
  await (await db()).runAsync('INSERT INTO drafts(employee,data) VALUES(?,?) ON CONFLICT(employee) DO UPDATE SET data=excluded.data', d.codigoEmpleado, JSON.stringify(d));
}
export async function loadDraft(employee: string): Promise<Draft | null> {
  const row = await (await db()).getFirstAsync<{ data: string }>('SELECT data FROM drafts WHERE employee=?', employee);
  return row ? hydratePhoto(JSON.parse(row.data)) : null;
}
function hydratePhoto<T extends { photoUri: string | null }>(value: T): T {
  return { ...value, photoUri: resolvePhotoUri(value.photoUri) ?? value.photoUri };
}
export async function discardDraft(employee: string) {
  await (await db()).runAsync('DELETE FROM drafts WHERE employee=?', employee); notifyData();
}
export async function startEditing(id: string, draft: Draft) {
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async tx => {
    const row = await tx.getFirstAsync<{ status: LocalReading['status']; data: string }>('SELECT status,data FROM readings WHERE clientId=?', id);
    if (!row || claimedReadings.has(id) || !canEditReading({ ...JSON.parse(row.data), status: row.status })) throw new Error('La sincronización ya empezó o la lectura fue revisada y enviada. Espera y vuelve a consultar.');
    await tx.runAsync('INSERT INTO drafts(employee,data) VALUES(?,?) ON CONFLICT(employee) DO UPDATE SET data=excluded.data', draft.codigoEmpleado, JSON.stringify(draft));
  });
}
