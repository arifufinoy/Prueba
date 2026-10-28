import { useCallback, useState } from 'react';
import { Alert, Image, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, Detail, Notice, Page } from '../../components/ui-kit';
import { createClientId, getReading, loadDraft, startEditing } from '../../database/repository';
import { useAppRuntime } from '../../context/RuntimeContext';
import { useSession } from '../../context/SessionContext';
import { useRegistration } from '../../context/RegistrationContext';
import { canEditReading, fromLocal, newDraft, workflowLabel } from '../../utils/rules';
import type { LocalReading } from '../../types/domain';
import { errorMessage } from '../../services/api';
import { statusLabels } from '../../constants/status';
import { styles as s } from '../../theme/design';
import { photoExists, resolvePhotoUri } from '../../services/photos';

export default function ReadingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { readings } = useAppRuntime(); const { employee } = useSession();
  const { restore, begin } = useRegistration(); const [loaded, setLoaded] = useState<LocalReading | null>(null); const [error, setError] = useState('');
  useFocusEffect(useCallback(() => { void getReading(id).then(setLoaded).catch(e => setError(errorMessage(e))); }, [id]));
  const reading = readings.find(r => r.clientId === id) ?? loaded;
  const edit = async (identificationOnly = false) => {
    try {
      if (!reading || !employee || reading.codigoEmpleado !== employee) return;
      const existing = await loadDraft(employee);
      if (existing && existing.clientId !== reading.clientId) { Alert.alert('Borrador en curso', 'Continúa o descarta el borrador desde Inicio antes de editar otra lectura.'); return; }
      const draft = existing ?? { ...fromLocal(reading), identificationOnly, step: identificationOnly ? 1 : reading.workflow === 'pending' ? 2 : reading.error && /foto|revisión física/i.test(reading.error) ? 4 : 3 };
      await startEditing(reading.clientId, draft); restore(draft); router.push(`/register/${draft.step}`);
    } catch (e) { setError(errorMessage(e)); }
  };
  const addReading = async () => {
    try {
      if (!employee || !reading) return;
      if (await loadDraft(employee)) { Alert.alert('Borrador en curso', 'Continúa o descarta el borrador desde Inicio antes de crear otro registro.'); return; }
      await begin({ ...newDraft(employee, await createClientId()), codigoMedidor: reading.codigoMedidor });
      router.push('/register/1');
    } catch (e) { setError(errorMessage(e)); }
  };
  if (!reading || reading.codigoEmpleado !== employee) return <Page title="Detalle de lectura" back><Notice>{error || 'Cargando registro local o registro no disponible para esta sesión.'}</Notice></Page>;
  return <Page title={reading.codigoMedidor} subtitle={`${reading.periodo} · ${workflowLabel(reading)}`} back>
    <Notice>Estado del registro: {workflowLabel(reading)} · Sincronización: {statusLabels[reading.status]}</Notice>
    {reading.workflow === 'pending' && <Notice>{reading.status === 'sent' ? 'Registro pendiente: falta completar el estado del medidor y su lectura.' : 'Registro en cola: se conserva en este dispositivo. Cuando se confirme el envío pasará a Pendiente.'}</Notice>}
    {error && <Notice danger>{error}</Notice>}
    {reading.error && <Notice>{reading.error}</Notice>}
    {reading.status === 'sent' && reading.verificacionPendiente && <Notice>Lectura recibida por MockAPI. Los valores anteriores siguen desconocidos; se comprobarán automáticamente cuando estén disponibles. No necesitas registrar la visita otra vez.</Notice>}
    <Card><Detail label="Fecha de visita" value={reading.fechaVisita} /><Detail label="Fecha de registro" value={reading.fechaRegistro} /><Detail label="Técnico" value={reading.codigoEmpleado} /><Detail label="Estado observado" value={reading.estadoMedidor} /><Detail label="Lectura actual (m³)" value={reading.lecturaActual} /><Detail label="Lectura anterior (m³)" value={reading.lecturaAnterior} /><Detail label="Consumo calculado (m³)" value={reading.consumoCalculado} /><Detail label="Consumo anómalo" value={reading.consumoAnomalo ? 'Sí' : 'No'} /><Detail label="Revisión física confirmada" value={reading.confirmacionAnomalia ? 'Sí' : 'No / no aplica'} /><Detail label="Motivo de inaccesibilidad" value={reading.motivoInaccesible} /><Detail label="Descripción del daño" value={reading.descripcionDanio} /></Card>
    {reading.photoUri && <Card><Text style={s.heading}>Evidencia local persistente</Text>{photoExists(reading.photoUri) ? <Image source={{ uri: resolvePhotoUri(reading.photoUri)! }} accessibilityLabel="Evidencia fotográfica de la lectura" style={{ width: '100%', height: 320, borderRadius: 18 }} resizeMode="contain" onError={() => setError('La fotografía no se encuentra en este dispositivo. Revisa la evidencia antes de enviar.')} /> : <Notice danger>La foto no existe en esta instalación. Abre «Corregir lectura» y vuelve a capturarla. Nunca se marcará una foto ausente como enviada.</Notice>}<Text selectable style={s.subtitle}>{reading.photoUri}</Text></Card>}
    <Card><Detail label="Identificador estable local" value={reading.clientId} /><Detail label="Identificador remoto MockAPI" value={reading.id} /><Detail label="Última sincronización confirmada" value={reading.fechaSincronizacion} /><Detail label="Intentos controlados" value={reading.attempts} /><Detail label="URL pública de fotografía" value={reading.fotoUrl} /></Card>
    {canEditReading(reading) && reading.workflow === 'pending' && <Button title="Editar registro pendiente" icon="create-outline" onPress={() => { void edit(true); }} />}
    {canEditReading(reading) && (reading.workflow !== 'pending' || reading.status === 'sent') ? <Button title={reading.workflow === 'pending' ? 'Registrar estado y lectura' : 'Corregir lectura'} icon="create-outline" onPress={() => { void edit(); }} /> : reading.workflow !== 'pending' && <Notice>La lectura revisada y enviada es de sólo consulta. Durante un envío la edición se bloquea para evitar duplicados.</Notice>}
    {reading.workflow !== 'pending' && <Button secondary title="Nueva lectura de este medidor" icon="add-circle-outline" onPress={() => { void addReading(); }} />}
  </Page>;
}
