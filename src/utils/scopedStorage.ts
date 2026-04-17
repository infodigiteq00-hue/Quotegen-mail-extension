import type { QuotationData } from '@/types/quotation';

const QUOTATION_PREFIX = 'quotegen:v1:quotation';
const TEMPLATE_PREFIX = 'quotegen:v1:template';

const DEFAULT_SCOPE = 'default';

export function normalizeScopeId(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-');
  return normalized || DEFAULT_SCOPE;
}

function getStorageKey(prefix: string, scopeId: string): string {
  return `${prefix}:${normalizeScopeId(scopeId)}`;
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function loadScopedQuotation(scopeId: string): QuotationData | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(getStorageKey(QUOTATION_PREFIX, scopeId));
    if (!raw) return null;
    return JSON.parse(raw) as QuotationData;
  } catch {
    return null;
  }
}

export function saveScopedQuotation(scopeId: string, data: QuotationData): void {
  const storage = getLocalStorage();
  if (!storage) return;

  storage.setItem(getStorageKey(QUOTATION_PREFIX, scopeId), JSON.stringify(data));
}

export function loadScopedTemplate(scopeId: string): string | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  return storage.getItem(getStorageKey(TEMPLATE_PREFIX, scopeId));
}

export function saveScopedTemplate(scopeId: string, templateId: string): void {
  const storage = getLocalStorage();
  if (!storage) return;

  storage.setItem(getStorageKey(TEMPLATE_PREFIX, scopeId), templateId);
}
