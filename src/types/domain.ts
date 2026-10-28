export type MeterState = 'normal' | 'inaccesible' | 'dañado';
export interface Meter {
  id: string; codigo: string; direccion: string; sector: string; numeroCuenta: string;
  estado: string; ultimaLectura: number; fechaUltimaLectura: string; consumoPromedioMensual: number;
}
export type QueueState = 'pending_verification' | 'pending_sync' | 'sending' | 'unknown_remote_result' | 'sent' | 'error' | 'conflict';
export interface Reading {
  id?: string; clientId: string; codigoMedidor: string; codigoEmpleado: string; periodo: string;
  fechaRegistro: string; fechaVisita: string; estadoMedidor: MeterState | null;
  workflow?: 'pending' | 'reviewed';
  lecturaActual: number | null; lecturaAnterior: number | null; consumoCalculado: number | null;
  consumoAnomalo: boolean; confirmacionAnomalia: boolean;
  motivoInaccesible: string | null; descripcionDanio: string | null; fotoUrl: string | null;
  tieneFoto: boolean; fechaSincronizacion?: string; verificacionPendiente?: boolean;
}
export interface LocalReading extends Reading {
  status: QueueState; photoUri: string | null; meter: Meter | null;
  error: string | null; attempts: number; nextAttempt: number;
}
export interface Draft {
  clientId: string; codigoEmpleado: string; codigoMedidor: string; fechaVisita: string;
  estadoMedidor: MeterState; lectura: string; motivo: string; danio: string;
  photoUri: string | null; confirmacionAnomalia: boolean; meter: Meter | null;
  step: number; editing: boolean;
  identificationOnly?: boolean;
}
