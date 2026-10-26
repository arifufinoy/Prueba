import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from '../context/SessionContext';
import { RegistrationProvider } from '../context/RegistrationContext';
import { RuntimeProvider } from '../context/RuntimeContext';
import { queryClient } from '../services/queryClient';
import { GlobalStatus } from '../components/GlobalStatus';
import { colors } from '../theme/design';

function Navigator() {
  const { employee, loading } = useSession();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /><Text style={{ textAlign: 'center' }}>Preparando jornada…</Text></View>;
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}><StatusBar style="dark" /><GlobalStatus /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!!employee}>
      <Stack.Screen name="index" /><Stack.Screen name="meter" /><Stack.Screen name="pending" /><Stack.Screen name="history" /><Stack.Screen name="profile" /><Stack.Screen name="reading/[id]" /><Stack.Screen name="register" options={{ gestureEnabled: false }} />
    </Stack.Protected>
    <Stack.Protected guard={!employee}><Stack.Screen name="login" /></Stack.Protected>
  </Stack></SafeAreaView>;
}
export default function Layout() {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><SessionProvider><RegistrationProvider><RuntimeProvider><Navigator /></RuntimeProvider></RegistrationProvider></SessionProvider></QueryClientProvider></SafeAreaProvider>;
}
