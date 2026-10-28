import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import type { LocalReading } from '../types/domain';
import { Card, Notice } from './ui-kit';
import { colors, styles as s } from '../theme/design';
import { statusLabels } from '../constants/status';
import { workflowLabel } from '../utils/rules';
export function ReadingList({ readings }: { readings: LocalReading[] }) {
  if (!readings.length) return <Card><Text style={s.text}>No hay lecturas para este filtro.</Text></Card>;
  return <>{readings.map(r => <Pressable key={r.clientId} accessibilityRole="button" accessibilityLabel={`Ver ${r.codigoMedidor}, ${workflowLabel(r)}`} onPress={() => router.push(`/reading/${r.clientId}`)}><Card><Text style={s.heading}>{r.codigoMedidor}</Text><Text style={s.subtitle}>{r.fechaVisita} · {r.estadoMedidor ?? 'Estado por registrar'} · {r.periodo}</Text><Text style={{ color: workflowLabel(r) === 'Revisado' ? colors.success : colors.warning, fontWeight: '600' }}>{workflowLabel(r)}</Text><Text style={s.subtitle}>Sincronización: {statusLabels[r.status]}</Text><Text style={s.text}>{r.workflow === 'pending' ? 'Falta completar estado y lectura' : r.lecturaActual === null ? 'Sin lectura numérica' : `${r.lecturaActual} m³`} {r.tieneFoto ? ' · fotografía asociada' : ''}</Text>{r.error && <Notice>{r.error}</Notice>}</Card></Pressable>)}</>;
}
