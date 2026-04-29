import { APP_CONFIG } from './app-config';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const API_BASE_URL = stripTrailingSlash(APP_CONFIG.apiUrl);

export function buildApiUrl(path = ''): string {
  if (!path) {
    return API_BASE_URL;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getApiOrigin(): string {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

export function resolveApiAssetUrl(path?: string | null): string | undefined {
  if (!path) {
    return undefined;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    return new URL(trimmed, `${getApiOrigin()}/`).toString();
  } catch {
    return trimmed;
  }
}
