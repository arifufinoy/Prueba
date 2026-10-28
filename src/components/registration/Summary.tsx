import { useState } from 'react';
import { Image, Text } from 'react-native';
import { router } from 'expo-router';
import type { Draft } from '../../types/domain';
import { Button, Card, Detail, Notice } from '../ui-kit';
import { AnomalyNotice } from './AnomalyNotice';
import { consumption, currentOf, toLocal, validateDraft } from '../../utils/rules';
import { photoExists } from '../../services/photos';
import { findLogical, errorMessage } from '../../services/api';
import { saveReading } from '../../database/repository';
import { onlineManager } from '@tanstack/react-query';
import { synchronizer } from '../../services/sync';
import { styles as s } from '../../theme/design';

export function Summary({ draft, flush, completed }: { draft: Draft; flush(): Promise<void>; completed(): Promise<void> }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const check = consumption(currentOf(draft), draft.meter);
  const save = async () => {
    setBusy(true); setError('');
    try {
      await flush();
      const availablePhoto = draft.photoUri && photoExists(draft.photoUri) ? draft.photoUri : null;
      const normalized = { ...draft, photoUri: availablePhoto };
      const issues = validateDraft(normalized);
      if (Object.keys(issues).length) throw new Error(Object.values(issues).join('\n'));
      const reading = toLocal(normalized);
      reading.workflow = 'reviewed';
      // A visit recorded without connectivity remains visibly pending verification,
      // even when an older meter snapshot is available locally.
      if (!onlineManager.isOnline()) reading.status = 'pending_verification';
      if (onlineManager.isOnline()) {
        // A failed preflight never destroys a field visit: save locally but block
        // posting until the centralized synchronizer can perform this check.
        let existing;
        try { existing = await findLogical(reading.codigoMedidor, reading.periodo); } catch { reading.status = 'pending_verification'; reading.error = 'Comprobación remota pendiente de conexión.'; }
        if (existing?.some(r => r.clientId !== reading.clientId)) throw new Error('Ya existe una lectura en MockAPI para este medidor y período. No se guardó una segunda lectura.');
      }
      await saveReading(reading); await completed();
      router.replace(`/reading/${reading.clientId}`);
      void synchronizer.run(draft.codigoEmpleado).catch(() => {});
    } catch (e) {
      const message = errorMessage(e);
      setError(message.includes('UNIQUE') ? 'Ya existe una lectura local para este medidor y período. Edítala desde Pendientes.' : message);
    } finally { setBusy(false); }
  };
  return <>
    <Card><Text style={s.heading}>{draft.codigoMedidor}</Text><Detail label="Técnico · período" value={`${draft.codigoEmpleado} · ${draft.fechaVisita.slice(0, 7)}`} /><Detail label="Fecha de visita" value={draft.fechaVisita} /><Detail label="Estado observado" value={draft.estadoMedidor} /><Detail label="Lectura actual (m³)" value={currentOf(draft)} /><Detail label="Lectura anterior (m³)" value={check.previous} /><Detail label="Consumo calculado (m³)" value={check.value} />{draft.estadoMedidor === 'inaccesible' && <Detail label="Motivo" value={draft.motivo} />}{draft.estadoMedidor === 'dañado' && <Detail label="Daño" value={draft.danio} />}<Detail label="Revisión de anomalía" value={check.anomalous ? draft.confirmacionAnomalia ? 'Confirmada físicamente' : 'Falta confirmar' : 'No aplica'} /></Card>
    {draft.photoUri && <Image source={{ uri: draft.photoUri }} accessibilityLabel="Evidencia que se guardará" style={{ width: '100%', height: 200, borderRadius: 20 }} resizeMode="contain" />}
    <AnomalyNotice draft={draft} />
    <Notice>El registro se guardará en SQLite y se enviará automáticamente a MockAPI al tener conexión, incluso si no hay registros previos. Se respetan la unicidad mensual y las validaciones conocidas. Si faltan datos anteriores, se indicará verificación pendiente. La fotografía permanece local.</Notice>
    {error && <Notice danger>{error}</Notice>}
    <Button title="Guardar como Revisado" icon="save-outline" loading={busy} onPress={() => { void save(); }} />
  </>;
}
