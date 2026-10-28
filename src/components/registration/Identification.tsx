import { Text } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import type { Draft } from '../../types/domain';
import { Button, Field, Notice } from '../ui-kit';
import { duplicateVisitMessage, localDate, parseLocalDate, periodOf, validCode, validVisit, validateDraft } from '../../utils/rules';
import { findLocalLogical } from '../../database/repository';
import { findLogical } from '../../services/api';
import { useAppRuntime } from '../../context/RuntimeContext';
import { styles as s } from '../../theme/design';

export function Identification({ draft, update, next, saving = false }: { draft: Draft; update(patch: Partial<Draft>): Promise<void>; next(): void; saving?: boolean }) {
  const [showDate, setShowDate] = useState(false);
  const [found, setFound] = useState<{ key: string; message: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const { online, readings } = useAppRuntime();
  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { codigoMedidor: draft.codigoMedidor, fechaVisita: draft.fechaVisita },
    resolver: values => {
      const issues = validateDraft({ ...draft, ...values }, 1);
      return Object.keys(issues).length ? { values: {}, errors: Object.fromEntries(Object.entries(issues).map(([key, message]) => [key, { type: 'validate', message }])) } : { values, errors: {} };
    },
  });
  const codigo = useWatch({ control, name: 'codigoMedidor' });
  const fecha = useWatch({ control, name: 'fechaVisita' });
  const period = periodOf(fecha);
  const key = `${codigo}|${fecha}`;
  const localDuplicate = readings.find(r => r.codigoMedidor === codigo && r.periodo === period && r.clientId !== draft.clientId);
  const duplicate = localDuplicate ? duplicateVisitMessage(fecha, localDuplicate.fechaVisita) : found?.key === key ? found.message : null;
  useEffect(() => {
    let active = true;
    if (!validCode(codigo) || !validVisit(fecha)) return;
    void (async () => {
      try {
        const local = await findLocalLogical(codigo, period, draft.clientId);
        if (!active) return;
        if (local) { setFound({ key, message: duplicateVisitMessage(fecha, local.fechaVisita) }); return; }
        if (!online) return;
        const remote = await findLogical(codigo, period);
        const existing = remote.find(r => r.clientId !== draft.clientId);
        if (active && existing) setFound({ key, message: duplicateVisitMessage(fecha, existing.fechaVisita) });
      } catch {
        // La comprobación remota se repite de forma definitiva al guardar.
      }
    })();
    return () => { active = false; };
  }, [codigo, fecha, online, draft.clientId, key, period]);
  const continueNext = async () => {
    if (duplicate || checking) return;
    setChecking(true);
    setCheckError('');
    try {
      const local = await findLocalLogical(codigo, period, draft.clientId);
      if (local) { setFound({ key, message: duplicateVisitMessage(fecha, local.fechaVisita) }); return; }
      if (online) {
        try {
          const remote = await findLogical(codigo, period);
          const existing = remote.find(r => r.clientId !== draft.clientId);
          if (existing) { setFound({ key, message: duplicateVisitMessage(fecha, existing.fechaVisita) }); return; }
        } catch {
          // Summary repite la comprobación definitiva y conserva la visita si falla la red.
        }
      }
      next();
    } catch {
      setCheckError('No se pudo comprobar la identidad del medidor. Intenta de nuevo.');
    } finally {
      setChecking(false);
    }
  };
  return <>
    <Controller control={control} name="codigoMedidor" render={({ field, fieldState }) => <Field label="Código del medidor" placeholder="MED-000001" maxLength={10} autoCapitalize="characters" editable={!draft.editing} value={field.value} onChangeText={value => { setFound(null); setCheckError(''); field.onChange(value); void update({ codigoMedidor: value, meter: null, confirmacionAnomalia: false }).catch(() => {}); }} error={fieldState.error?.message || duplicate || undefined} />} />
    <Text style={s.label}>Fecha de visita · período {fecha.slice(0, 7)}</Text>
    <Button secondary title={fecha} icon="calendar-outline" disabled={draft.editing && !draft.identificationOnly} onPress={() => setShowDate(true)} />
    {showDate && <DateTimePicker value={parseLocalDate(fecha)} maximumDate={new Date()} mode="date" onChange={(_, selected) => { setShowDate(false); if (selected) { const value = localDate(selected); setFound(null); setCheckError(''); setValue('fechaVisita', value); void update({ fechaVisita: value, confirmacionAnomalia: false }).catch(() => {}); } }} />}
    {errors.fechaVisita && <Text style={s.error}>{errors.fechaVisita.message}</Text>}
    {duplicate && <Text accessibilityLiveRegion="polite" style={s.error}>{duplicate}</Text>}
    {checkError && <Notice danger>{checkError}</Notice>}
    <Text style={s.subtitle}>El código y período identifican una sola lectura. No se consultará la API con un formato inválido.</Text>
    {draft.identificationOnly && <Notice>Guarda sólo el código y la fecha. Sin conexión quedará En cola; al sincronizar quedará Pendiente para completar estado y lectura.</Notice>}
    {draft.identificationOnly && draft.editing && <Notice>Puedes corregir la fecha dentro del mismo mes. El código y el mes del registro se conservan.</Notice>}
    <Button title={draft.identificationOnly ? 'Guardar registro' : 'Continuar'} icon="save-outline" disabled={!!duplicate || checking || saving} loading={checking || saving} onPress={handleSubmit(() => { void continueNext(); })} />
  </>;
}
