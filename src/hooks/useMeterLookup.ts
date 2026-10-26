import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { lookupMeter } from '../services/meters';
import { validCode } from '../utils/rules';
export function useMeterLookup(code: string) {
  return useQuery({ queryKey: queryKeys.meters.detail(code), queryFn: () => lookupMeter(code), enabled: validCode(code), networkMode: 'always' });
}
