import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { errorMessage } from '../services/api';

interface SessionValue { employee: string | null; loading: boolean; error: string | null; signIn(code: string, password: string): Promise<void>; signOut(): Promise<void> }
const Context = createContext<SessionValue | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [employee, setEmployee] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    SecureStore.getItemAsync('epmaps.session').then(value => { if (value === 'EMP-001') setEmployee(value); }).catch(e => setError(errorMessage(e))).finally(() => setLoading(false));
  }, []);
  const signIn = async (code: string, password: string) => {
    if (code !== 'EMP-001' || password !== 'Demo2026!') throw new Error('Código de empleado o contraseña incorrectos.');
    await SecureStore.setItemAsync('epmaps.session', code); setEmployee(code); setError(null);
  };
  const signOut = async () => { await SecureStore.deleteItemAsync('epmaps.session'); setEmployee(null); };
  return <Context.Provider value={{ employee, loading, error, signIn, signOut }}>{children}</Context.Provider>;
}
export function useSession() { const value = useContext(Context); if (!value) throw new Error('SessionProvider no disponible'); return value; }
