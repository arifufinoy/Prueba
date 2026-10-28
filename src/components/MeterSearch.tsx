import { useState } from 'react';
import { Text } from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Button, Field, Notice } from './ui-kit';
import { MeterCard } from './MeterCard';
import { useMeterLookup } from '../hooks/useMeterLookup';
import { mayShowMeterResults, validCode } from '../utils/rules';
import { errorMessage } from '../services/api';
import { styles as s } from '../theme/design';

export function MeterSearch() {
  const [code, setCode] = useState('');
  const { control, handleSubmit } = useForm({ defaultValues: { code: '' }, mode: 'onChange' });
  const inputCode = useWatch({ control, name: 'code' });
  const query = useMeterLookup(code);
  const canShowMeters = mayShowMeterResults(inputCode);
  return <>
    <Controller control={control} name="code" rules={{ validate: value => validCode(value) || 'Formato requerido: MED- seguido de seis dígitos.' }} render={({ field, fieldState }) => <Field label="Código de medidor" placeholder="MED-000001" autoCapitalize="characters" maxLength={10} value={field.value} onChangeText={value => { field.onChange(value); setCode(''); }} error={fieldState.error?.message} />} />
    <Button title="Buscar medidor" icon="search-outline" disabled={!validCode(inputCode)} loading={query.isFetching} onPress={handleSubmit(values => { if (values.code === code) void query.refetch(); else setCode(values.code); })} />
    {canShowMeters && query.error && <Notice danger>{errorMessage(query.error)}</Notice>}
    {canShowMeters && query.data && query.data.codigo === inputCode && <><MeterCard meter={query.data} /><Text style={s.subtitle}>Copia conservada durante la jornada y en SQLite para consultas sin conexión.</Text></>}
    {canShowMeters && code && query.isSuccess && !query.data && <Notice>No hay información previa para este código. Puedes registrar y enviar la primera visita igualmente; consumo y lectura anterior serán null.</Notice>}
    {!canShowMeters && <Text style={s.subtitle}>Escribe el código completo para consultar los datos del medidor. No se realizan consultas con códigos incompletos.</Text>}
  </>;
}
