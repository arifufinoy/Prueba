import { Directory, File, Paths } from 'expo-file-system';
export async function persistPhoto(uri: string, clientId: string) {
  const directory = new Directory(Paths.document, 'epmaps-photos');
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `${clientId}-${Date.now()}.jpg`);
  await new File(uri).copy(destination);
  if (!destination.exists || destination.size === 0) throw new Error('No se pudo conservar la fotografía. No se modificó el borrador.');
  return destination.uri;
}
export const photoExists = (uri: string | null) => !!uri && new File(uri).exists;
