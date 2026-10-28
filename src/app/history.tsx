import { useState } from 'react';
import { Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Notice, Page } from '../components/ui-kit';
import { ReadingList } from '../components/ReadingList';
import { useAppRuntime } from '../context/RuntimeContext';
import { localDate, parseLocalDate } from '../utils/rules';
import { styles as s } from '../theme/design';

export default function History() {
  const { readings } = useAppRuntime();
  const [period, setPeriod] = useState(''); const [showDate, setShowDate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent'>('all');
  const visible = readings.filter(r => (!period || r.periodo === period) && (filter === 'all' || r.workflow !== 'pending'));
  return <Page title="Registros" subtitle="Lecturas guardadas en este dispositivo" back>
    <Button secondary icon="calendar-outline" title={`Período: ${period || 'todos'}`} onPress={() => setShowDate(true)} />
    {showDate && <DateTimePicker value={parseLocalDate(`${period || localDate().slice(0, 7)}-01`)} maximumDate={new Date()} mode="date" onChange={(_, date) => { setShowDate(false); if (date) setPeriod(localDate(date).slice(0, 7)); }} />}
    {!!period && <Button title="Ver todos los períodos" secondary onPress={() => setPeriod('')} />}
    <Button title={filter === 'sent' ? 'Estado: revisados' : 'Estado: todos'} secondary onPress={() => setFilter(value => value === 'sent' ? 'all' : 'sent')} />
    <Text style={s.heading}>Tus registros ({visible.length})</Text>
    <ReadingList readings={visible} />
    {!visible.length && <Notice>{readings.length ? 'No hay registros que coincidan con los filtros seleccionados.' : 'Los registros que guardes aparecerán aquí. No se cargan lecturas de MockAPI en la aplicación.'}</Notice>}
  </Page>;
}
