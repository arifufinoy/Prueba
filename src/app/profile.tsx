import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Detail, Notice, Page } from '../components/ui-kit';
import { useSession } from '../context/SessionContext';
import { useRegistration } from '../context/RegistrationContext';
import { errorMessage } from '../services/api';
import { styles as s } from '../theme/design';
export default function Profile() {
  const { employee, signOut } = useSession(); const { flush } = useRegistration();
  const [compact, setCompact] = useState(false); const [error, setError] = useState('');
  useEffect(() => { void AsyncStorage.getItem('epmaps.showHelp').then(value => setCompact(value !== 'false')).catch(e => setError(errorMessage(e))); }, []);
  return <Page title="Perfil del técnico" subtitle="EPMAPS · Operaciones de agua potable" back>
    <Card><Detail label="Código de empleado" value={employee} /><Detail label="Sesión" value="Activa · conservada en SecureStore" /><Detail label="Aplicación" value="Registro de Lecturas · 1.0.0 / SDK 57" /></Card>
    <Card><View style={s.row}><Switch accessibilityLabel="Mostrar ayuda de campo" value={compact} onValueChange={value => { setCompact(value); void AsyncStorage.setItem('epmaps.showHelp', String(value)).catch(e => setError(errorMessage(e))); }} /><Text style={[s.text, { flex: 1 }]}>Mostrar ayuda de campo</Text></View>{compact && <Text style={s.subtitle}>Consulta el medidor si hay conexión, registra el estado físico y revisa el consumo. La cola se envía automáticamente. No desinstales la aplicación mientras existan registros o fotos locales.</Text>}</Card>
    <Notice>Sesión académica de demostración. Las credenciales predefinidas no sustituyen un servicio de autenticación de producción. No se guarda tu contraseña.</Notice>
    {error && <Notice danger>{error}</Notice>}
    <Button title="Cerrar sesión" secondary icon="log-out-outline" onPress={() => Alert.alert('¿Cerrar sesión?', 'Tus lecturas y borrador se conservan. Se solicitarán credenciales para volver a entrar.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cerrar sesión', onPress: () => { void flush().then(signOut).catch(e => setError(errorMessage(e))); } }])} />
  </Page>;
}
