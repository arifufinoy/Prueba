import { useEffect } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import type { Draft } from '../../types/domain';
import { useMeterLookup } from '../../hooks/useMeterLookup';
import { MeterCard } from '../MeterCard';
import { Button, Notice } from '../ui-kit';
import { errorMessage } from '../../services/api';
import { styles as s } from '../../theme/design';

export function MeterInformation({ draft, update, next }: { draft: Draft; update(patch: Partial<Draft>): Promise<void>; next(): void }) {
  const query = useMeterLookup(draft.codigoMedidor);
  useEffect(() => {
    if (query.data && query.data.codigo === draft.codigoMedidor && JSON.stringify(query.data) !== JSON.stringify(draft.meter)) void update({ meter: query.data, confirmacionAnomalia: false }).catch(() => {});
  }, [query.data, draft.codigoMedidor, draft.meter, update]);
  return <>
    {query.isFetching && <ActivityIndicator />}
    {draft.meter && draft.meter.codigo === draft.codigoMedidor ? <MeterCard meter={draft.meter} /> : <Notice>Sin información previa disponible. Puedes continuar offline. No se inventará una lectura anterior; el registro quedará pendiente de verificación.</Notice>}
    {query.error && !draft.meter && <Notice>{errorMessage(query.error)} Puedes continuar sin consulta previa.</Notice>}
    <Text style={s.subtitle}>Comprueba la ubicación y el código físico antes de registrar la visita.</Text>
    <Button title="Registrar estado y lectura" icon="arrow-forward" onPress={next} />
  </>;
}
