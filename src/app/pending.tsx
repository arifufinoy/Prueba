import { Page, Notice } from '../components/ui-kit';
import { ReadingList } from '../components/ReadingList';
import { useAppRuntime } from '../context/RuntimeContext';
export default function Pending() {
  const { readings } = useAppRuntime();
  const queue = readings.filter(r => r.workflow === 'pending' || r.status !== 'sent');
  const sending = queue.filter(r => r.status === 'sending' || r.status === 'unknown_remote_result').length;
  return <Page title="Pendientes y cola" subtitle={`${queue.filter(r => r.workflow === 'pending' && r.status === 'sent').length} pendientes de completar · ${sending} enviándose`} back><Notice>En cola: esperando confirmación de sincronización. Pendiente: abre el registro y pulsa «Registrar estado y lectura». Al completar y guardar pasa a Revisado.</Notice>{!queue.length && <Notice>No tienes registros pendientes ni envíos en cola.</Notice>}<ReadingList readings={queue} /></Page>;
}
