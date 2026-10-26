import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { listReadings, subscribeData } from '../database/repository';
import { synchronizer } from '../services/sync';
import type { LocalReading } from '../types/domain';

onlineManager.setOnline(false);
export function useRuntime(employee: string | null) {
  const [online, setOnline] = useState(false);
  const [readings, setReadings] = useState<LocalReading[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setBusy(synchronizer.running);
      if (employee) void listReadings(employee).then(r => { if (active) setReadings(r); }).catch(() => { if (active) setError('No se pudo leer SQLite.'); });
      else setReadings([]);
    };
    const run = () => { if (employee && AppState.currentState === 'active') void synchronizer.run(employee).catch(() => setError('La sincronización se reintentará. Los datos siguen locales.')); };
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      onlineManager.setOnline(connected); setOnline(connected); if (connected) run();
    });
    const app = AppState.addEventListener('change', state => {
      focusManager.setFocused(state === 'active'); if (state === 'active') { void NetInfo.refresh(); run(); refresh(); }
    });
    const remove = subscribeData(refresh);
    const timer = setInterval(run, 30000);
    refresh(); run();
    return () => { active = false; unsubscribe(); app.remove(); remove(); clearInterval(timer); };
  }, [employee]);
  return { online, readings, busy, error };
}
