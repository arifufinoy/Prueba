import { useEffect, useState } from 'react';
import { Alert, BackHandler, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Notice, Page } from '../../components/ui-kit';
import { useRegistration } from '../../context/RegistrationContext';
import { Identification } from '../../components/registration/Identification';
import { MeterInformation } from '../../components/registration/MeterInformation';
import { StateForm } from '../../components/registration/StateForm';
import { PhotoForm } from '../../components/registration/PhotoForm';
import { Summary } from '../../components/registration/Summary';
import { validateDraft } from '../../utils/rules';
import { errorMessage } from '../../services/api';
import { colors, styles as s } from '../../theme/design';

const titles = ['Identificar medidor', 'Información del medidor', 'Estado y lectura', 'Fotografía y revisión', 'Resumen de visita'];
export default function RegistrationScreen() {
  const { step: param } = useLocalSearchParams<{ step: string }>();
  const step = Math.max(1, Math.min(5, Number(param) || 1));
  const { draft, update, flush, clear, persistenceError } = useRegistration();
  const [error, setError] = useState('');
  const exit = () => Alert.alert('¿Pausar registro?', 'Los cambios se conservan como borrador. Puedes continuar desde Inicio.', [
    { text: 'Seguir registrando', style: 'cancel' },
    { text: 'Guardar y salir', onPress: () => { void flush().then(() => router.replace('/')).catch(e => setError(errorMessage(e))); } },
  ]);
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { exit(); return true; }); return () => subscription.remove(); });
  if (!draft) return <Page title="Registro no cargado"><Notice>Recupera tu borrador desde Inicio antes de continuar.</Notice><Button title="Ir a inicio" onPress={() => router.replace('/')} /></Page>;
  const move = async (target: number) => {
    try {
      if (target > step) {
        const issues = validateDraft(draft, step === 2 ? 1 : step);
        if (Object.keys(issues).length) throw new Error(Object.values(issues).join('\n'));
      }
      await update({ step: target }); await flush(); setError(''); router.replace(`/register/${target}`);
    } catch (e) { setError(errorMessage(e)); }
  };
  const props = { draft, update, next: () => { void move(step + 1); } };
  return <Page title={titles[step - 1]} subtitle={`VISITA DE CAMPO · PASO ${step} DE 5`}>
    <View style={{ flexDirection: 'row', gap: 8 }}>{titles.map((_, index) => <View key={index} style={{ flex: 1, height: 6, borderRadius: 4, backgroundColor: index < step ? colors.primary : '#C8D9E3' }} />)}</View>
    <Text style={s.subtitle}>{draft.codigoMedidor || 'Nuevo registro'} · borrador persistente</Text>
    {(error || persistenceError) && <Notice danger>{error || persistenceError}</Notice>}
    {step === 1 && <Identification {...props} />}
    {step === 2 && <MeterInformation {...props} />}
    {step === 3 && <StateForm {...props} />}
    {step === 4 && <PhotoForm {...props} flush={flush} />}
    {step === 5 && <Summary draft={draft} flush={flush} completed={() => clear(draft.codigoEmpleado)} />}
    {step > 1 && <Button title="Paso anterior" secondary icon="arrow-back" onPress={() => { void move(step - 1); }} />}
    <Button title="Pausar y volver a inicio" secondary onPress={exit} />
  </Page>;
}
