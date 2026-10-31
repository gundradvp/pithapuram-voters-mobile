// Memory-backed fallback for environments where window.localStorage is blocked (e.g. cross-origin iframes in Bolt.new)
const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStore[key] ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {}
    memoryStore[key] = value;
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {}
    delete memoryStore[key];
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {}
    for (const k in memoryStore) {
      delete memoryStore[k];
    }
  },

  keys(): string[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Object.keys(window.localStorage);
      }
    } catch {}
    return Object.keys(memoryStore);
  }
};
