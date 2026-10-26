import { create, isAxiosError } from 'axios';
import type { Meter, Reading } from '../types/domain';
import { validCode } from '../utils/rules';

export const api = create({ baseURL: process.env.EXPO_PUBLIC_API_URL, timeout: 15000, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use(config => {
  if (!config.baseURL || !/^https:\/\//.test(config.baseURL)) throw new Error('Configura EXPO_PUBLIC_API_URL con una URL HTTPS.');
  return config;
});
export function errorMessage(error: unknown) {
  if (isAxiosError(error)) return error.response ? `MockAPI respondió HTTP ${error.response.status}. Revisa el recurso y sus campos.` : 'No se pudo confirmar la comunicación. Tus datos siguen guardados.';
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
async function collection<T>(resource: string, params?: Record<string, string>): Promise<T[]> {
  // MockAPI can return 404 for an empty filter. Full collection distinguishes that
  // from a missing resource: never interpret an unavailable resource as empty.
  let data: unknown;
  try { data = (await api.get(resource, { params })).data; }
  catch (error) {
    if (params && isAxiosError(error) && error.response?.status === 404) data = (await api.get(resource)).data;
    else throw error;
  }
  if (!Array.isArray(data)) throw new Error(`Respuesta inválida en ${resource}; se esperaba una colección.`);
  return data as T[];
}
export async function fetchMeter(code: string): Promise<Meter | null> {
  if (!validCode(code)) throw new Error('Código inválido. No se envió ninguna consulta.');
  const rows = await collection<Meter>('/medidores', { codigo: code });
  const exact = rows.filter(m => m.codigo === code);
  if (exact.length > 1) throw new Error('Hay varios medidores con el mismo código en MockAPI. Corrige la fuente.');
  const meter = exact[0];
  if (!meter) return null;
  if (!['direccion','sector','numeroCuenta','estado','fechaUltimaLectura','id'].every(key => typeof meter[key as keyof Meter] === 'string') || !Number.isFinite(meter.ultimaLectura) || meter.ultimaLectura < 0 || !Number.isFinite(meter.consumoPromedioMensual) || meter.consumoPromedioMensual < 0 || Number.isNaN(Date.parse(meter.fechaUltimaLectura))) throw new Error('El medidor remoto tiene campos incompletos o inválidos. Verifica su modelo.');
  return meter;
}
export const findClient = async (clientId: string) => (await collection<Reading>('/lecturas', { clientId })).filter(r => r.clientId === clientId);
export const findLogical = async (codigo: string, periodo: string) => {
  if (!validCode(codigo)) throw new Error('Código inválido.');
  return (await collection<Reading>('/lecturas', { codigoMedidor: codigo })).filter(r => r.codigoMedidor === codigo && r.periodo === periodo);
};
export const fetchHistory = (employee: string) => collection<Reading>('/lecturas', { codigoEmpleado: employee }).then(rows => rows.filter(r => r.codigoEmpleado === employee));
