import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppRuntime } from '../context/RuntimeContext';
import { colors } from '../theme/design';
export function GlobalStatus() {
  const { online, readings, busy, error } = useAppRuntime();
  const pending = readings.filter(r => r.status !== 'sent').length;
  const incomplete = readings.filter(r => r.workflow === 'pending' && r.status === 'sent').length;
  const sending = readings.filter(r => r.status === 'sending' || r.status === 'unknown_remote_result').length;
  const syncLabel = busy ? 'Sincronizando…' : !online && pending ? 'Esperando red' : readings.some(r => r.status === 'unknown_remote_result') ? 'Reconciliación' : pending ? 'En espera / revisión' : 'Al día';
  return <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.background, paddingHorizontal: 22, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#CCDCE5', gap: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={online ? 'cloud-done-outline' : 'cloud-offline-outline'} size={18} color={online ? colors.success : colors.warning} /><Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>{online ? 'Con conexión' : 'Sin conexión · modo de campo'} · {pending} por enviar · {incomplete} pendientes de completar{sending ? ` · ${sending} enviándose` : ''}</Text><Text style={{ fontSize: 11, color: colors.primary, maxWidth: 105 }}>{syncLabel}</Text></View>
    {error && <Text style={{ fontSize: 12, color: colors.danger }}>{error}</Text>}
  </View>;
}
