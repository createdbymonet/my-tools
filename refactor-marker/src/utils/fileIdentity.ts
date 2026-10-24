import type { Uri } from 'vscode';

type UriIdentity = Pick<Uri, 'scheme' | 'authority' | 'path' | 'query' | 'fragment'>;

/** Preserve stored spelling while comparing local Windows paths without case. */
export function filePathKey(filePath: string, caseInsensitive = process.platform === 'win32'): string {
  return caseInsensitive ? filePath.toLowerCase() : filePath;
}

/** Virtual and remote URIs, queries, and fragments retain their exact identities. */
export function uriKey(uri: UriIdentity, caseInsensitive = process.platform === 'win32'): string {
  const foldPath = uri.scheme === 'file' && caseInsensitive;
  return JSON.stringify([
    uri.scheme,
    filePathKey(uri.authority, foldPath),
    filePathKey(uri.path, foldPath),
    uri.query,
    uri.fragment,
  ]);
}

export function sameUri(a: UriIdentity, b: UriIdentity): boolean {
  return uriKey(a) === uriKey(b);
}
