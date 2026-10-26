import { onlineManager } from '@tanstack/react-query';
import { cachedMeter, cacheMeter } from '../database/repository';
import { queryKeys } from '../constants/queryKeys';
import { validCode } from '../utils/rules';
import { fetchMeter } from './api';
import { queryClient } from './queryClient';

export async function lookupMeter(code: string) {
  if (!validCode(code)) throw new Error('Introduce MED- seguido de seis dígitos.');
  const local = await cachedMeter(code);
  if (!onlineManager.isOnline()) return local;
  try {
    const meter = await fetchMeter(code);
    if (meter) { await cacheMeter(meter); return meter; }
    return local;
  } catch (error) { if (local) return local; throw error; }
}
export async function verifyMeter(code: string) {
  const meter = await fetchMeter(code);
  if (meter) {
    await cacheMeter(meter);
    queryClient.setQueryData(queryKeys.meters.detail(code), meter);
  }
  return meter;
}
