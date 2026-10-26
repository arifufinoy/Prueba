import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Draft } from '../../types/domain';
import { consumption, currentOf, validateDraft } from '../../utils/rules';
import { persistPhoto, photoExists } from '../../services/photos';
import { errorMessage } from '../../services/api';
import { Button, Card, Notice } from '../ui-kit';
import { AnomalyNotice } from './AnomalyNotice';
import { colors, styles as s } from '../../theme/design';

export function PhotoForm({ draft, update, flush, next }: { draft: Draft; update(patch: Partial<Draft>): Promise<void>; flush(): Promise<void>; next(): void }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const check = consumption(currentOf(draft), draft.meter);
  const required = check.anomalous || draft.estadoMedidor === 'dañado';
  const saveResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0]) {
      const uri = await persistPhoto(result.assets[0].uri, draft.clientId);
      await update({ photoUri: uri });
    }
  };
  useEffect(() => {
    void ImagePicker.getPendingResultAsync().then(async result => {
      if (result && 'canceled' in result) await saveResult(result);
    }).catch(e => setError(errorMessage(e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const capture = async () => {
    setBusy(true); setError('');
    try {
      await flush(); // survives Android activity destruction during the camera UI
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Necesitamos tu cámara', `La foto documenta el medidor. ${required ? 'Tu borrador está conservado; completa la foto para guardar.' : 'La foto es opcional; puedes continuar sin ella.'}`, [
          { text: 'Ahora no', style: 'cancel' }, { text: 'Abrir configuración', onPress: () => { void Linking.openSettings().catch(e => setError(errorMessage(e))); } },
        ]); return;
      }
      await saveResult(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false }));
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <>
    <AnomalyNotice draft={draft} />
    <Card><Text style={s.heading}>Evidencia fotográfica</Text><Text style={s.subtitle}>{required ? 'Obligatoria para esta lectura.' : 'Opcional: añade evidencia de la visita.'} Se conserva en documentos privados del dispositivo, no en caché temporal.</Text>
      {draft.photoUri && <Image accessibilityLabel="Fotografía del medidor" source={{ uri: draft.photoUri }} resizeMode="contain" style={{ width: '100%', height: 280, borderRadius: 16, backgroundColor: '#D5E2EA' }} />}
      <Button title={draft.photoUri ? 'Reemplazar fotografía' : 'Tomar fotografía'} icon="camera-outline" loading={busy} onPress={() => { void capture(); }} />
      {draft.photoUri && !required && <Button title="Quitar fotografía del registro" secondary icon="trash-outline" onPress={() => { void update({ photoUri: null }).catch(e => setError(errorMessage(e))); }} />}
    </Card>
    {check.anomalous && <Card><View style={s.row}><Switch accessibilityLabel="Confirmo revisión física de anomalía" value={draft.confirmacionAnomalia} onValueChange={value => { void update({ confirmacionAnomalia: value }).catch(e => setError(errorMessage(e))); }} trackColor={{ true: colors.primary }} /><Text style={[s.text, { flex: 1 }]}>Revisé físicamente el medidor y confirmo que la lectura es correcta.</Text></View></Card>}
    {error && <Notice danger>{error}</Notice>}
    <Button title="Revisar resumen" icon="arrow-forward" onPress={() => {
      if (draft.photoUri && !photoExists(draft.photoUri)) { setError('No se encuentra la foto asociada. Reemplázala o quítala si es opcional.'); return; }
      const issues = validateDraft({ ...draft, photoUri: photoExists(draft.photoUri) ? draft.photoUri : null }, 4);
      if (Object.keys(issues).length) setError(Object.values(issues).join('\n')); else next();
    }} />
  </>;
}
