import { createContext, useContext, useRef, useState, type PropsWithChildren } from 'react';
import type { Draft } from '../types/domain';
import { discardDraft, saveDraft } from '../database/repository';

interface RegistrationValue {
  draft: Draft | null; persistenceError: string | null;
  restore(d: Draft): void; update(patch: Partial<Draft>): Promise<void>; begin(d: Draft): Promise<void>; clear(employee: string): Promise<void>; flush(): Promise<void>;
}
const Context = createContext<RegistrationValue | null>(null);
export function RegistrationProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [persistenceError, setError] = useState<string | null>(null);
  const current = useRef<Draft | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const restore = (d: Draft) => { current.current = d; setDraft(d); };
  const persist = (d: Draft) => {
    const task = writes.current.catch(() => {}).then(() => saveDraft(d));
    writes.current = task;
    task.then(() => setError(null), () => setError('No se pudo guardar el borrador. No cierres la aplicación y libera espacio.'));
    return task;
  };
  const update = async (patch: Partial<Draft>) => {
    if (!current.current) return;
    const next = { ...current.current, ...patch }; restore(next); await persist(next);
  };
  const begin = async (d: Draft) => { restore(d); await persist(d); };
  const clear = async (employee: string) => { await writes.current; await discardDraft(employee); current.current = null; setDraft(null); };
  return <Context.Provider value={{ draft, persistenceError, restore, update, begin, clear, flush: () => writes.current }}>{children}</Context.Provider>;
}
export function useRegistration() { const value = useContext(Context); if (!value) throw new Error('RegistrationProvider no disponible'); return value; }
