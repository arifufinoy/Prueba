import { Text, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { Draft, MeterState } from '../../types/domain';
import { validateDraft } from '../../utils/rules';
import { Button, Card, Detail, Field } from '../ui-kit';
import { AnomalyNotice } from './AnomalyNotice';
import { styles as s } from '../../theme/design';

export function StateForm({ draft, update, next }: { draft: Draft; update(patch: Partial<Draft>): Promise<void>; next(): void }) {
  const { control, handleSubmit, setValue } = useForm({
    defaultValues: { estadoMedidor: draft.estadoMedidor, lectura: draft.lectura, motivo: draft.motivo, danio: draft.danio },
    resolver: values => {
      const issues = validateDraft({ ...draft, ...values }, 3);
      return Object.keys(issues).length ? { values: {}, errors: Object.fromEntries(Object.entries(issues).map(([key, message]) => [key, { type: 'validate', message }])) } : { values, errors: {} };
    },
  });
  const [estadoMedidor, lectura, motivo, danio] = useWatch({ control, name: ['estadoMedidor', 'lectura', 'motivo', 'danio'] });
  const values = { estadoMedidor, lectura, motivo, danio };
  const patch = (value: Partial<Draft>) => { void update({ ...value, confirmacionAnomalia: false }).catch(() => {}); };
  const changeState = (state: MeterState) => {
    setValue('estadoMedidor', state); setValue('lectura', ''); setValue('motivo', ''); setValue('danio', '');
    patch({ estadoMedidor: state, lectura: '', motivo: '', danio: '' });
  };
  return <>
    <Text style={s.label}>Estado observado en la visita</Text>
    <View style={{ gap: 14 }}>{(['normal','inaccesible','dañado'] as const).map(state => <Button key={state} title={state === 'normal' ? 'Normal · lectura disponible' : state === 'inaccesible' ? 'Inaccesible · no se pudo leer' : 'Dañado · requiere evidencia'} secondary={values.estadoMedidor !== state} icon={state === 'normal' ? 'checkmark-circle-outline' : state === 'inaccesible' ? 'lock-closed-outline' : 'construct-outline'} onPress={() => changeState(state)} />)}</View>
    {values.estadoMedidor !== 'inaccesible' && <Controller control={control} name="lectura" render={({ field, fieldState }) => <Field label={`Lectura actual (m³)${values.estadoMedidor === 'dañado' ? ' · opcional' : ' · obligatoria'}`} keyboardType="decimal-pad" placeholder="0.000" value={field.value} onChangeText={value => { field.onChange(value); patch({ lectura: value }); }} error={fieldState.error?.message} />} />}
    {values.estadoMedidor === 'inaccesible' && <Controller control={control} name="motivo" render={({ field, fieldState }) => <Field label="Motivo de inaccesibilidad" multiline placeholder="Explica por qué no fue posible acceder…" value={field.value} onChangeText={value => { field.onChange(value); patch({ motivo: value }); }} error={fieldState.error?.message} />} />}
    {values.estadoMedidor === 'dañado' && <Controller control={control} name="danio" render={({ field, fieldState }) => <Field label="Descripción del daño" multiline placeholder="Describe el daño visible…" value={field.value} onChangeText={value => { field.onChange(value); patch({ danio: value }); }} error={fieldState.error?.message} />} />}
    <AnomalyNotice draft={{ ...draft, ...values }} />
    <Card><Detail label="Lectura previa" value={draft.meter ? `${draft.meter.ultimaLectura} m³` : null} /><Detail label="Promedio mensual" value={draft.meter ? `${draft.meter.consumoPromedioMensual} m³` : null} /></Card>
    <Button title="Fotografía y confirmaciones" icon="arrow-forward" onPress={handleSubmit(next)} />
  </>;
}
