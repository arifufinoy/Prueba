import { useState } from 'react';
import { Text } from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Button, Field, Notice } from './ui-kit';
import { MeterCard } from './MeterCard';
import { useMeterLookup } from '../hooks/useMeterLookup';
import { validCode } from '../utils/rules';
import { errorMessage } from '../services/api';
import { styles as s } from '../theme/design';

export function MeterSearch() {
  const [code, setCode] = useState('');
  const { control, handleSubmit } = useForm({ defaultValues: { code: '' }, mode: 'onChange' });
  const inputCode = useWatch({ control, name: 'code' });
  const query = useMeterLookup(code);
  return <>
    <Controller control={control} name="code" rules={{ validate: value => validCode(value) || 'Formato requerido: MED- seguido de seis dígitos.' }} render={({ field, fieldState }) => <Field label="Código de medidor" placeholder="MED-000001" autoCapitalize="characters" maxLength={10} value={field.value} onChangeText={value => { field.onChange(value); setCode(''); }} error={fieldState.error?.message} />} />
    <Button title="Consultar catastro" icon="search-outline" disabled={!validCode(inputCode)} loading={query.isFetching} onPress={handleSubmit(values => setCode(values.code))} />
    {query.error && <Notice danger>{errorMessage(query.error)}</Notice>}
    {query.data && <><MeterCard meter={query.data} /><Text style={s.subtitle}>Copia conservada durante la jornada y en SQLite para consultas sin conexión.</Text></>}
    {code && query.isSuccess && !query.data && <Notice>No hay información disponible para este código. Puedes registrar una visita sin datos previos; quedará pendiente de verificación.</Notice>}
  </>;
}
