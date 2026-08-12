import { useCallback, useMemo } from 'react';
import { decodeQueryValue, encodeQueryValue, inspectQueryValue, updateQueryStates } from '../core/query-state.js';
import type { QueryEvent, QueryInvalidEvent, QueryStateDefinitions, UseQueryStatesOptions } from '../shared/types.js';
import { useQueryDiagnostics } from './query-diagnostics.js';
import { useQuerySource, useQuerySourceSnapshot } from './query-source.js';

type Values<T extends QueryStateDefinitions> = {
  [K in keyof T]: T[K] extends { codec: infer C }
    ? C extends { decode(values: readonly string[]): infer V }
      ? V
      : never
    : never;
};

type Setter<T extends QueryStateDefinitions> = (
  patch: Partial<Values<T>> | ((current: Values<T>) => Partial<Values<T>>),
) => void;

function decodeValues<T extends QueryStateDefinitions>(
  snapshot: string,
  definitions: T,
): { values: Values<T>; invalidEvents: readonly QueryInvalidEvent[]; events: readonly QueryEvent[] } {
  const result = {} as Values<T>;
  const invalidEvents: QueryInvalidEvent[] = [];
  const events: QueryEvent[] = [];
  for (const key of Object.keys(definitions) as Array<keyof T>) {
    const definition = definitions[key]!;
    const decoded = inspectQueryValue(snapshot, String(key), definition.codec, definition.defaultValue);
    result[key] = decoded.value as Values<T>[typeof key];
    invalidEvents.push(...decoded.invalidEvents);
    events.push(...decoded.events);
  }
  return { values: result, invalidEvents, events };
}

export function useQueryStates<T extends QueryStateDefinitions>(
  definitions: T,
  options: UseQueryStatesOptions = {},
): readonly [Values<T>, Setter<T>, () => void] {
  const { history = 'replace', onEvent, onInvalid, serverSnapshot, source: providedSource } = options;
  const source = useQuerySource(providedSource, serverSnapshot);
  const snapshotUrl = useQuerySourceSnapshot(source, serverSnapshot);
  const decoded = useMemo(() => decodeValues(snapshotUrl, definitions), [snapshotUrl, definitions]);
  useQueryDiagnostics(decoded, { onEvent, onInvalid });
  const setValues = useCallback<Setter<T>>(
    (patch) => {
      const current = {} as Values<T>;
      for (const key of Object.keys(definitions) as Array<keyof T>) {
        const definition = definitions[key]!;
        current[key] = decodeQueryValue(source.getSnapshot(), String(key), definition.codec, {
          defaultValue: definition.defaultValue,
          onEvent,
          onInvalid,
        }) as Values<T>[typeof key];
      }
      const nextPatch = typeof patch === 'function' ? patch(current) : patch;
      const updates = new Map<string, readonly string[] | undefined>();
      for (const [key, value] of Object.entries(nextPatch)) {
        const definition = definitions[key];
        if (!definition) continue;
        updates.set(key, encodeQueryValue(definition.codec, value, definition.defaultValue));
      }
      updateQueryStates(source, updates, history, onEvent);
    },
    [definitions, history, onEvent, onInvalid, source],
  );
  const reset = useCallback(() => {
    const updates = new Map(Object.keys(definitions).map((key) => [key, undefined] as const));
    updateQueryStates(source, updates, history, onEvent);
  }, [definitions, history, onEvent, source]);
  return [decoded.values, setValues, reset];
}
