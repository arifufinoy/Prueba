import { Text } from 'react-native';
import type { Meter } from '../types/domain';
import { styles as s } from '../theme/design';
import { Card, Detail } from './ui-kit';
export function MeterCard({ meter }: { meter: Meter }) {
  return <Card><Text style={s.heading}>{meter.codigo}</Text><Detail label="Dirección" value={meter.direccion} /><Detail label="Sector · cuenta" value={`${meter.sector} · ${meter.numeroCuenta}`} /><Detail label="Estado en catastro" value={meter.estado} /><Detail label="Última lectura" value={`${meter.ultimaLectura} m³`} /><Detail label="Fecha de última lectura" value={meter.fechaUltimaLectura} /><Detail label="Promedio mensual" value={`${meter.consumoPromedioMensual} m³`} /></Card>;
}
