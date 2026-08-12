import { useMemo } from 'react';
import { createQueryState, inspectQueryValue } from '../core/query-state.js';
import type { QueryCodec, UseQueryStateOptions } from '../shared/types.js';
import { useQueryDiagnostics } from './query-diagnostics.js';
import { useQuerySource, useQuerySourceSnapshot } from './query-source.js';

export function useQueryState<T>(
  key: string,
  codec: QueryCodec<T>,
  options: UseQueryStateOptions<T> = {},
): readonly [T | undefined, (value: T | ((current: T | undefined) => T)) => void, () => void] {
  const { defaultValue, history, onEvent, onInvalid, serverSnapshot, source: providedSource } = options;
  const source = useQuerySource(providedSource, serverSnapshot);
  const snapshotUrl = useQuerySourceSnapshot(source, serverSnapshot);
  const controller = useMemo(
    () => createQueryState(source, key, codec, { defaultValue, history, onEvent, onInvalid }),
    [source, key, codec, defaultValue, history, onEvent, onInvalid],
  );
  const decoded = useMemo(
    () => inspectQueryValue(snapshotUrl, key, codec, defaultValue),
    [snapshotUrl, key, codec, defaultValue],
  );
  useQueryDiagnostics(decoded, { onEvent, onInvalid });
  return [decoded.value, controller.set, controller.reset];
}
