import { useState } from 'react';
import { Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Detail, Notice, Page } from '../components/ui-kit';
import { ReadingList } from '../components/ReadingList';
import { useAppRuntime } from '../context/RuntimeContext';
import { useSession } from '../context/SessionContext';
import { localDate, parseLocalDate } from '../utils/rules';
import { queryKeys } from '../constants/queryKeys';
import { errorMessage, fetchHistory } from '../services/api';
import { styles as s } from '../theme/design';

export default function History() {
  const { readings, online } = useAppRuntime(); const { employee } = useSession();
  const [period, setPeriod] = useState(localDate().slice(0, 7)); const [showDate, setShowDate] = useState(false);
  const [filter, setFilter] = useState<'sent' | 'all'>('sent');
  const remote = useQuery({ queryKey: queryKeys.readings.employee(employee ?? ''), queryFn: () => fetchHistory(employee!), enabled: !!employee && online });
  const visible = readings.filter(r => (!period || r.periodo === period) && (filter === 'all' || r.status === 'sent'));
  const remoteOnly = remote.data?.filter(r => (!period || r.periodo === period) && !readings.some(local => local.clientId === r.clientId || local.id === r.id));
  return <Page title="Historial de lecturas" subtitle="Registros locales y enviados por este técnico" back>
    <Button secondary icon="calendar-outline" title={`Período: ${period || 'todos'}`} onPress={() => setShowDate(true)} />
    {showDate && <DateTimePicker value={parseLocalDate(`${period || localDate().slice(0, 7)}-01`)} maximumDate={new Date()} mode="date" onChange={(_, date) => { setShowDate(false); if (date) setPeriod(localDate(date).slice(0, 7)); }} />}
    <Button title="Ver todos los períodos" secondary onPress={() => setPeriod('')} />
    <Button title={filter === 'sent' ? 'Estado: enviadas · mostrar todos' : 'Estado: todos · sólo enviadas'} secondary onPress={() => setFilter(filter === 'sent' ? 'all' : 'sent')} />
    <ReadingList readings={visible} />
    {remote.isFetching && <Text style={s.subtitle}>Consultando historial remoto…</Text>}
    {remote.error && !readings.length && <Notice>{errorMessage(remote.error)}</Notice>}
    {!!remoteOnly?.length && <Text style={s.heading}>También en MockAPI · solo lectura</Text>}
    {remoteOnly?.map(r => <Card key={r.id}><Text style={s.heading}>{r.codigoMedidor}</Text><Detail label="Período · fecha" value={`${r.periodo} · ${r.fechaVisita ?? r.fechaRegistro}`} /><Detail label="Estado" value={r.estadoMedidor} /><Detail label="Actual / anterior / consumo (m³)" value={`${r.lecturaActual ?? '—'} / ${r.lecturaAnterior ?? '—'} / ${r.consumoCalculado ?? '—'}`} /><Detail label="Motivo / daño" value={r.motivoInaccesible ?? r.descripcionDanio} /><Detail label="Anomalía / confirmación" value={`${r.consumoAnomalo ? 'Sí' : 'No'} / ${r.confirmacionAnomalia ? 'Sí' : 'No'}`} /><Detail label="clientId / ID remoto" value={`${r.clientId} / ${r.id}`} /><Detail label="Fotografía pública" value={r.fotoUrl} /><Text style={s.subtitle}>Registro remoto confirmado. No editable. {r.tieneFoto && !r.fotoUrl ? 'La evidencia puede residir en otro dispositivo.' : ''}</Text></Card>)}
  </Page>;
}
