import type { Draft } from '../../types/domain';
import { consumption, currentOf } from '../../utils/rules';
import { Notice } from '../ui-kit';
export function AnomalyNotice({ draft }: { draft: Draft }) {
  const check = consumption(currentOf(draft), draft.meter);
  if (check.inconsistent) return <Notice danger>Lectura menor que la anterior ({check.previous} m³). Corrige la lectura antes de continuar; no se acepta consumo negativo.</Notice>;
  if (check.anomalous) return <Notice>Consumo anómalo: {currentOf(draft)} − {check.previous} = {check.value} m³. Supera estrictamente 3 × {draft.meter?.consumoPromedioMensual} = {(draft.meter?.consumoPromedioMensual ?? 0) * 3} m³. Revisión física y fotografía obligatorias.</Notice>;
  if (!draft.meter) return <Notice>Verificación pendiente: no conocemos la lectura previa ni el promedio. La aplicación los comprobará al recuperar conexión.</Notice>;
  return null;
}
