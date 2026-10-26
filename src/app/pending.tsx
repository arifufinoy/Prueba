import { Page, Notice } from '../components/ui-kit';
import { ReadingList } from '../components/ReadingList';
import { useAppRuntime } from '../context/RuntimeContext';
export default function Pending() {
  const { readings } = useAppRuntime();
  return <Page title="Lecturas pendientes" subtitle="Tu trabajo está conservado · sincronización automática" back><Notice>Las anomalías requieren revisión física y foto. Los resultados inciertos se reconcilian sin repetir el envío; mientras tanto no pueden editarse.</Notice><ReadingList readings={readings.filter(r => r.status !== 'sent')} /></Page>;
}
