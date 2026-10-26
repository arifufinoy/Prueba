import * as SQLite from 'expo-sqlite';
import type { Draft, LocalReading, Meter } from '../types/domain';
import { migrationV1 } from './schema';
import { editable, fromLocal, validateDraft } from '../utils/rules';

let database: Promise<SQLite.SQLiteDatabase> | undefined;
const listeners = new Set<() => void>();
export const subscribeData = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const notifyData = () => listeners.forEach(fn => fn());
export function db() {
  database ??= (async () => {
    const connection = await SQLite.openDatabaseAsync('epmaps.db');
    await connection.execAsync('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const version = await connection.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) < 1) await connection.withExclusiveTransactionAsync(async tx => { await tx.execAsync(migrationV1); });
    // A terminated process may have posted successfully. Never blindly retry it.
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
  return rows.map(row => JSON.parse(row.data));
}
export async function getReading(clientId: string): Promise<LocalReading | null> {
  const row = await (await db()).getFirstAsync<{ data: string }>('SELECT data FROM readings WHERE clientId=?', clientId);
  return row ? JSON.parse(row.data) : null;
}
export async function saveReading(r: LocalReading) {
  const issues = validateDraft(fromLocal(r));
  if (Object.keys(issues).length) throw new Error(Object.values(issues).join('\n'));
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async tx => {
    const row = await tx.getFirstAsync<{ status: LocalReading['status']; data: string }>('SELECT status,data FROM readings WHERE clientId=?', r.clientId);
    if (row && !editable(row.status)) throw new Error('El registro está enviado o en reconciliación y no puede editarse.');
    if (row) {
      const previous: LocalReading = JSON.parse(row.data);
      r.fechaRegistro = previous.fechaRegistro;
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
    const row = await tx.getFirstAsync<{ data: string; status: string }>('SELECT data,status FROM readings WHERE clientId=?', id);
    if (!row || !['pending_sync','pending_verification','error','unknown_remote_result'].includes(row.status)) return;
    const r: LocalReading = JSON.parse(row.data);
    if (r.nextAttempt > Date.now()) return;
    // Draft being edited leases the row out of the queue, including across restarts.
    const draft = await tx.getFirstAsync<{ data: string }>('SELECT data FROM drafts WHERE employee=?', r.codigoEmpleado);
    if (draft && (JSON.parse(draft.data) as Draft).clientId === id) return;
    result = r;
    await tx.runAsync("UPDATE readings SET status='sending' WHERE clientId=?", id);
  });
  return result;
}
export async function saveDraft(d: Draft) {
  await (await db()).runAsync('INSERT INTO drafts(employee,data) VALUES(?,?) ON CONFLICT(employee) DO UPDATE SET data=excluded.data', d.codigoEmpleado, JSON.stringify(d));
}
export async function loadDraft(employee: string): Promise<Draft | null> {
  const row = await (await db()).getFirstAsync<{ data: string }>('SELECT data FROM drafts WHERE employee=?', employee);
  return row ? JSON.parse(row.data) : null;
}
export async function discardDraft(employee: string) {
  await (await db()).runAsync('DELETE FROM drafts WHERE employee=?', employee); notifyData();
}
export async function startEditing(id: string, draft: Draft) {
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async tx => {
    const row = await tx.getFirstAsync<{ status: LocalReading['status'] }>('SELECT status FROM readings WHERE clientId=?', id);
    if (!row || !editable(row.status)) throw new Error('El envío ya comenzó. Espera la reconciliación.');
    await tx.runAsync('INSERT INTO drafts(employee,data) VALUES(?,?) ON CONFLICT(employee) DO UPDATE SET data=excluded.data', draft.codigoEmpleado, JSON.stringify(draft));
  });
}
