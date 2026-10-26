import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import type { LocalReading } from '../types/domain';
import { Card, Notice } from './ui-kit';
import { colors, styles as s } from '../theme/design';
import { statusLabels } from '../constants/status';
export function ReadingList({ readings }: { readings: LocalReading[] }) {
  if (!readings.length) return <Card><Text style={s.text}>No hay lecturas para este filtro.</Text></Card>;
  return <>{readings.map(r => <Pressable key={r.clientId} accessibilityRole="button" accessibilityLabel={`Ver ${r.codigoMedidor}, ${statusLabels[r.status]}`} onPress={() => router.push(`/reading/${r.clientId}`)}><Card><Text style={s.heading}>{r.codigoMedidor}</Text><Text style={s.subtitle}>{r.fechaVisita} · {r.estadoMedidor} · {r.periodo}</Text><Text style={{ color: r.status === 'sent' ? colors.success : colors.warning, fontWeight: '600' }}>{statusLabels[r.status]}</Text><Text style={s.text}>{r.lecturaActual === null ? 'Sin lectura numérica' : `${r.lecturaActual} m³`} {r.tieneFoto ? ' · con evidencia local' : ''}</Text>{r.error && <Notice>{r.error}</Notice>}</Card></Pressable>)}</>;
}
