import { Text } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import type { Draft } from '../../types/domain';
import { Button, Field } from '../ui-kit';
import { localDate, parseLocalDate, validateDraft } from '../../utils/rules';
import { styles as s } from '../../theme/design';

export function Identification({ draft, update, next }: { draft: Draft; update(patch: Partial<Draft>): Promise<void>; next(): void }) {
  const [showDate, setShowDate] = useState(false);
  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { codigoMedidor: draft.codigoMedidor, fechaVisita: draft.fechaVisita },
    resolver: values => {
      const issues = validateDraft({ ...draft, ...values }, 1);
      return Object.keys(issues).length ? { values: {}, errors: Object.fromEntries(Object.entries(issues).map(([key, message]) => [key, { type: 'validate', message }])) } : { values, errors: {} };
    },
  });
  const fecha = useWatch({ control, name: 'fechaVisita' });
  return <>
    <Controller control={control} name="codigoMedidor" render={({ field, fieldState }) => <Field label="Código del medidor" placeholder="MED-000001" maxLength={10} autoCapitalize="characters" editable={!draft.editing} value={field.value} onChangeText={value => { field.onChange(value); void update({ codigoMedidor: value, meter: null, confirmacionAnomalia: false }).catch(() => {}); }} error={fieldState.error?.message} />} />
    <Text style={s.label}>Fecha de visita · período {fecha.slice(0, 7)}</Text>
    <Button secondary title={fecha} icon="calendar-outline" disabled={draft.editing} onPress={() => setShowDate(true)} />
    {showDate && <DateTimePicker value={parseLocalDate(fecha)} maximumDate={new Date()} mode="date" onChange={(_, selected) => { setShowDate(false); if (selected) { const value = localDate(selected); setValue('fechaVisita', value); void update({ fechaVisita: value, confirmacionAnomalia: false }).catch(() => {}); } }} />}
    {errors.fechaVisita && <Text style={s.error}>{errors.fechaVisita.message}</Text>}
    <Text style={s.subtitle}>El código y período identifican una sola lectura. No se consultará la API con un formato inválido.</Text>
    <Button title="Continuar" icon="arrow-forward" onPress={handleSubmit(next)} />
  </>;
}
