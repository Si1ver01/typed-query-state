import type { QuerySource } from '../shared/types.js';

export function createMemoryQuerySource(initialUrl = '/'): QuerySource {
  let snapshot = initialUrl;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    navigate(url: string) {
      if (url === snapshot) return;
      snapshot = url;
      for (const listener of listeners) listener();
    },
  };
}
