import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, Notice, Page } from '../components/ui-kit';
import { useSession } from '../context/SessionContext';
import { useAppRuntime } from '../context/RuntimeContext';
import { useRegistration } from '../context/RegistrationContext';
import { createClientId, discardDraft, loadDraft } from '../database/repository';
import { newDraft } from '../utils/rules';
import { colors, styles as s } from '../theme/design';
import { statusLabels } from '../constants/status';
import { errorMessage } from '../services/api';

export default function Dashboard() {
  const { employee } = useSession(); const { readings, online } = useAppRuntime();
  const { begin, restore, clear } = useRegistration(); const [error, setError] = useState('');
  const checkDraft = useCallback(async () => {
    if (!employee) return;
    const saved = await loadDraft(employee);
    if (saved) Alert.alert('Tienes un registro incompleto', `${saved.codigoMedidor || 'Nuevo medidor'} · paso ${saved.step} de 5`, [
      { text: 'Descartar borrador', style: 'destructive', onPress: () => { void clear(employee).catch(e => setError(errorMessage(e))); } },
      { text: 'Continuar registro', onPress: () => { restore(saved); router.push(`/register/${saved.step}`); } },
    ], { cancelable: true });
  }, [employee, clear, restore]);
  // Focus, not context render changes, controls the recovery dialog.
  useFocusEffect(useCallback(() => { void checkDraft().catch(e => setError(errorMessage(e))); }, [employee])); // eslint-disable-line react-hooks/exhaustive-deps
  const start = async () => {
    try {
      if (!employee) return;
      if (await loadDraft(employee)) { await checkDraft(); return; }
      const id = await createClientId();
      await discardDraft(employee); await begin(newDraft(employee, id)); router.push('/register/1');
    } catch (e) { setError(errorMessage(e)); }
  };
  const pending = readings.filter(r => r.status !== 'sent').length;
  return <Page title="Tu jornada, al día." subtitle={`Hola, ${employee} · ${new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}`}>
    <View style={s.row}><Ionicons name="water" color={colors.primary} size={26} /><Text style={[s.heading, { flex: 1, letterSpacing: 3 }]}>EPMAPS</Text><Pressable accessibilityLabel="Abrir perfil" onPress={() => router.push('/profile')} style={s.card}><Ionicons name="person-outline" size={20} color={colors.primary} /></Pressable></View>
    <Card><Text style={s.subtitle}>REGISTRO DE LECTURAS</Text><Text style={[s.title, { fontSize: 25 }]}>Cada lectura cuenta.</Text><Text style={s.subtitle}>Registra, documenta y continúa. Conservamos tu trabajo, incluso fuera de cobertura.</Text><Button title="Nueva lectura" icon="add-circle-outline" onPress={() => { void start(); }} /></Card>
    {error && <Notice danger>{error}</Notice>}
    <View style={s.row}>{[['Registradas', readings.length], ['Pendientes', pending], ['Enviadas', readings.length - pending]].map(([label, value]) => <View key={label} style={[s.card, { flex: 1, minWidth: 88, padding: 14, alignItems: 'center' }]}><Text style={[s.title, { fontSize: 28 }]}>{value}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text></View>)}</View>
    <Button title="Consultar medidor" secondary icon="search-outline" onPress={() => router.push('/meter')} />
    <View style={s.row}><View style={{ flex: 1 }}><Button title="Pendientes" secondary icon="cloud-upload-outline" onPress={() => router.push('/pending')} /></View><View style={{ flex: 1 }}><Button title="Historial" secondary icon="time-outline" onPress={() => router.push('/history')} /></View></View>
    <Text style={s.heading}>Actividad reciente</Text>
    {!readings.length && <Card><Ionicons name="clipboard-outline" size={32} color={colors.sky} /><Text style={s.text}>Tu primera lectura comienza aquí.</Text><Text style={s.subtitle}>No hay registros locales todavía. {online ? 'Los medidores se consultan en el catastro remoto.' : 'Puedes registrar un medidor sin consultarlo previamente.'}</Text></Card>}
    {readings.slice(0, 4).map(r => <Pressable key={r.clientId} onPress={() => router.push(`/reading/${r.clientId}`)}><Card><Text style={s.heading}>{r.codigoMedidor}</Text><Text style={s.subtitle}>{r.fechaVisita} · {r.periodo}</Text><Text style={{ color: r.status === 'sent' ? colors.success : colors.warning }}>{statusLabels[r.status]}</Text></Card></Pressable>)}
  </Page>;
}
