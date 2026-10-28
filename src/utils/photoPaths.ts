export function resolveStoredPhoto(uri: string | null, documents: string, exists: (path: string) => boolean) {
  if (!uri) return null;
  if (exists(uri)) return uri;
  const match = /(?:^|\/)epmaps-photos\/([^/]+)$/.exec(uri);
  if (!match || !/^[a-zA-Z0-9._-]+$/.test(match[1]) || match[1] === '.' || match[1] === '..') return null;
  const candidate = `${documents.replace(/\/$/, '')}/epmaps-photos/${match[1]}`;
  return exists(candidate) ? candidate : null;
}
