import { onlineManager } from '@tanstack/react-query';
import { api, findClient, findLogical } from './api';
import { claimReading, listReadings, notifyData, releaseReading, writeQueue } from '../database/repository';
import { photoExists } from './photos';
import { verifyMeter } from './meters';
import { queryClient } from './queryClient';
import { queryKeys } from '../constants/queryKeys';
import { createSynchronizer } from './syncEngine';

export const synchronizer = createSynchronizer({
  list: listReadings, claim: claimReading, release: releaseReading, write: writeQueue, meter: verifyMeter,
  client: findClient, logical: findLogical, post: async payload => (await api.post('/lecturas', payload)).data,
  update: async (id, payload) => (await api.put(`/lecturas/${encodeURIComponent(id)}`, payload)).data,
  photo: photoExists, online: () => onlineManager.isOnline(),
  changed: () => { notifyData(); void queryClient.invalidateQueries({ queryKey: queryKeys.readings.all }); },
});
