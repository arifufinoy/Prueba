import type { QueueState } from '../types/domain';
export const statusLabels: Record<QueueState, string> = {
  pending_verification: 'Pendiente de verificación', pending_sync: 'Pendiente de envío', sending: 'Enviándose',
  unknown_remote_result: 'Reconciliando resultado', sent: 'Enviada', error: 'Reintento programado', conflict: 'Conflicto de identidad',
};
