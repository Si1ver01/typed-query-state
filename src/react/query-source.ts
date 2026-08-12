import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { createBrowserQuerySource } from '../core/browser-source.js';
import { createMemoryQuerySource } from '../core/memory-source.js';
import type { QuerySource } from '../shared/types.js';

let defaultBrowserSource: QuerySource | undefined;

function resolveQuerySource(source: QuerySource | undefined, serverSnapshot: string | undefined): QuerySource {
  if (source) return source;
  if (typeof window === 'undefined') return createMemoryQuerySource(serverSnapshot ?? '/');
  return (defaultBrowserSource ??= createBrowserQuerySource());
}

export function useQuerySource(source: QuerySource | undefined, serverSnapshot: string | undefined): QuerySource {
  return useMemo(() => resolveQuerySource(source, serverSnapshot), [source, serverSnapshot]);
}

export function useQuerySourceSnapshot(source: QuerySource, serverSnapshot: string | undefined): string {
  const getServerSnapshot = useCallback(() => serverSnapshot ?? source.getSnapshot(), [serverSnapshot, source]);
  return useSyncExternalStore(source.subscribe, source.getSnapshot, getServerSnapshot);
}
