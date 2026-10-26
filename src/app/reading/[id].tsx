import { useCallback, useState } from 'react';
import { Alert, Image, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, Detail, Notice, Page } from '../../components/ui-kit';
import { getReading, loadDraft, startEditing } from '../../database/repository';
import { useAppRuntime } from '../../context/RuntimeContext';
import { useSession } from '../../context/SessionContext';
import { useRegistration } from '../../context/RegistrationContext';
import { editable, fromLocal } from '../../utils/rules';
import type { LocalReading } from '../../types/domain';
import { errorMessage } from '../../services/api';
import { statusLabels } from '../../constants/status';
import { styles as s } from '../../theme/design';

export default function ReadingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { readings } = useAppRuntime(); const { employee } = useSession();
  const { restore } = useRegistration(); const [loaded, setLoaded] = useState<LocalReading | null>(null); const [error, setError] = useState('');
  useFocusEffect(useCallback(() => { void getReading(id).then(setLoaded).catch(e => setError(errorMessage(e))); }, [id]));
  const reading = readings.find(r => r.clientId === id) ?? loaded;
  const edit = async () => {
    try {
      if (!reading || !employee || reading.codigoEmpleado !== employee) return;
      const existing = await loadDraft(employee);
      if (existing && existing.clientId !== reading.clientId) { Alert.alert('Borrador en curso', 'Continúa o descarta el borrador desde Inicio antes de editar otra lectura.'); return; }
      const draft = existing ?? fromLocal(reading);
      await startEditing(reading.clientId, draft); restore(draft); router.push(`/register/${draft.step}`);
    } catch (e) { setError(errorMessage(e)); }
  };
  if (!reading || reading.codigoEmpleado !== employee) return <Page title="Detalle de lectura" back><Notice>{error || 'Cargando registro local o registro no disponible para esta sesión.'}</Notice></Page>;
  return <Page title={reading.codigoMedidor} subtitle={`${reading.periodo} · ${statusLabels[reading.status]}`} back>
    {error && <Notice danger>{error}</Notice>}
    {reading.error && <Notice>{reading.error}</Notice>}
    <Card><Detail label="Fecha de visita" value={reading.fechaVisita} /><Detail label="Fecha de registro" value={reading.fechaRegistro} /><Detail label="Técnico" value={reading.codigoEmpleado} /><Detail label="Estado observado" value={reading.estadoMedidor} /><Detail label="Lectura actual (m³)" value={reading.lecturaActual} /><Detail label="Lectura anterior (m³)" value={reading.lecturaAnterior} /><Detail label="Consumo calculado (m³)" value={reading.consumoCalculado} /><Detail label="Consumo anómalo" value={reading.consumoAnomalo ? 'Sí' : 'No'} /><Detail label="Revisión física confirmada" value={reading.confirmacionAnomalia ? 'Sí' : 'No / no aplica'} /><Detail label="Motivo de inaccesibilidad" value={reading.motivoInaccesible} /><Detail label="Descripción del daño" value={reading.descripcionDanio} /></Card>
    {reading.photoUri && <Card><Text style={s.heading}>Evidencia local persistente</Text><Image source={{ uri: reading.photoUri }} accessibilityLabel="Evidencia fotográfica de la lectura" style={{ width: '100%', height: 320, borderRadius: 18 }} resizeMode="contain" onError={() => setError('La fotografía no se encuentra en este dispositivo. Revisa la evidencia antes de enviar.')} /><Text selectable style={s.subtitle}>{reading.photoUri}</Text></Card>}
    <Card><Detail label="Identificador estable local" value={reading.clientId} /><Detail label="Identificador remoto MockAPI" value={reading.id} /><Detail label="Última sincronización confirmada" value={reading.fechaSincronizacion} /><Detail label="Intentos controlados" value={reading.attempts} /><Detail label="URL pública de fotografía" value={reading.fotoUrl} /></Card>
    {editable(reading.status) ? <Button title="Editar lectura pendiente" icon="create-outline" onPress={() => { void edit(); }} /> : <Notice>{reading.status === 'sent' ? 'Lectura enviada confirmada. Disponible exclusivamente para consulta.' : 'Edición bloqueada mientras se confirma el resultado remoto para evitar duplicados.'}</Notice>}
  </Page>;
}
