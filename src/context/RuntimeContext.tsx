import { createContext, useContext, type PropsWithChildren } from 'react';
import { useRuntime } from '../hooks/useRuntime';
import { useSession } from './SessionContext';
const Context = createContext<ReturnType<typeof useRuntime> | null>(null);
export function RuntimeProvider({ children }: PropsWithChildren) {
  const { employee } = useSession(); const value = useRuntime(employee);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppRuntime() { const value = useContext(Context); if (!value) throw new Error('RuntimeProvider no disponible'); return value; }
