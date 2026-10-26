import { onlineManager } from '@tanstack/react-query';
import { api, findClient, findLogical } from './api';
import { claimReading, listReadings, notifyData, writeQueue } from '../database/repository';
import { photoExists } from './photos';
import { verifyMeter } from './meters';
import { queryClient } from './queryClient';
import { queryKeys } from '../constants/queryKeys';
import { createSynchronizer } from './syncEngine';

export const synchronizer = createSynchronizer({
  list: listReadings, claim: claimReading, write: writeQueue, meter: verifyMeter,
  client: findClient, logical: findLogical, post: async payload => (await api.post('/lecturas', payload)).data,
  photo: photoExists, online: () => onlineManager.isOnline(),
  changed: () => { notifyData(); void queryClient.invalidateQueries({ queryKey: queryKeys.readings.all }); },
});
