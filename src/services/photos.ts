import { Directory, File, Paths } from 'expo-file-system';
import { resolveStoredPhoto } from '../utils/photoPaths';
export async function persistPhoto(uri: string, clientId: string) {
  const directory = new Directory(Paths.document, 'epmaps-photos');
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `${clientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  await new File(uri).copy(destination);
  if (!destination.exists || destination.size === 0) throw new Error('No se pudo conservar la fotografía. No se modificó el borrador.');
  return destination.uri;
}
export function resolvePhotoUri(uri: string | null): string | null {
  return resolveStoredPhoto(uri, Paths.document.uri, path => {
    try { const file = new File(path); return file.exists && file.size > 0; }
    catch { return false; }
  });
}
export const photoExists = (uri: string | null) => resolvePhotoUri(uri) !== null;
