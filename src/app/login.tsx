import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { Button, Card, Field, Notice, Page } from '../components/ui-kit';
import { useSession } from '../context/SessionContext';
import { styles as s } from '../theme/design';
import { errorMessage } from '../services/api';

export default function Login() {
  const { signIn, error: sessionError } = useSession();
  const [error, setError] = useState('');
  const { control, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { code: '', password: '' } });
  return <Page title="Agua que conecta." subtitle="EPMAPS · Registro de lecturas de agua">
    <View style={{ alignItems: 'center', paddingVertical: 18 }}><View style={[s.card, { borderRadius: 44, width: 94, height: 94, padding: 0, alignItems: 'center', justifyContent: 'center' }]}><Image source={require('../../assets/images/epmaps-icon.png')} accessibilityLabel="Símbolo de agua de la aplicación" style={{ width: 84, height: 84, borderRadius: 42 }} /></View><Text style={[s.heading, { letterSpacing: 5, marginTop: 22 }]}>EPMAPS</Text><Text style={s.subtitle}>OPERACIONES EN CAMPO</Text></View>
    <Card><Text style={s.heading}>Bienvenido, técnico</Text><Text style={s.subtitle}>Ingresa para comenzar tu jornada. Tus registros estarán disponibles sin conexión.</Text>
      <Controller control={control} name="code" rules={{ required: 'Introduce tu código de empleado.' }} render={({ field, fieldState }) => <Field label="Código de empleado" placeholder="EMP-001" autoCapitalize="characters" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
      <Controller control={control} name="password" rules={{ required: 'Introduce tu contraseña.' }} render={({ field, fieldState }) => <Field label="Contraseña" placeholder="Tu contraseña" secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
      {(error || sessionError) && <Notice danger>{error || sessionError}</Notice>}
      <Button title="Iniciar jornada" icon="arrow-forward" loading={isSubmitting} onPress={handleSubmit(async values => { try { await signIn(values.code, values.password); } catch (e) { setError(errorMessage(e)); } })} />
    </Card><Text style={[s.subtitle, { textAlign: 'center' }]}>Demostración: EMP-001 · Demo2026!{ '\n' }Uso académico · sesión local, no autenticación de producción</Text>
  </Page>;
}
