import type { QuerySource } from '../shared/types.js';

export function createBrowserQuerySource(): QuerySource {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserQuerySource() must be called in a browser environment');
  }
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    getSnapshot: () => window.location.href,
    subscribe(listener) {
      listeners.add(listener);
      window.addEventListener('popstate', notify);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener('popstate', notify);
      };
    },
    navigate(url, mode) {
      if (url === window.location.href) return;
      const method = mode === 'push' ? window.history.pushState : window.history.replaceState;
      method.call(window.history, {}, '', url);
      notify();
    },
  };
}
