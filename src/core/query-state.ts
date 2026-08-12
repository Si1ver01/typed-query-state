import type {
  HistoryMode,
  QueryCodec,
  QueryEvent,
  QueryEventListener,
  QueryInvalidEvent,
  QuerySource,
  QueryStateOptions,
} from '../shared/types.js';

const URL_BASE = 'http://typed-query-state.local';

export function toURL(snapshot: string): URL {
  return new URL(snapshot, URL_BASE);
}

export function fromURL(url: URL, original: string): string {
  if (/^https?:\/\//.test(original)) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

export function readQueryValues(snapshot: string, key: string): readonly string[] {
  return toURL(snapshot).searchParams.getAll(key);
}

export function updateQueryValues(
  snapshot: string,
  updates: ReadonlyMap<string, readonly string[] | undefined>,
): string {
  const url = toURL(snapshot);
  for (const [key, values] of updates) {
    url.searchParams.delete(key);
    if (values) for (const value of values) url.searchParams.append(key, value);
  }
  return fromURL(url, snapshot);
}

export type QueryStateController<T> = {
  get(): T | undefined;
  set(value: T | ((current: T | undefined) => T)): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
};

function emit(options: Pick<QueryStateOptions<unknown>, 'onEvent'>, event: QueryEvent): void {
  options.onEvent?.(event);
}

export type QueryDecodeResult<T> = {
  value: T | undefined;
  invalidEvents: readonly QueryInvalidEvent[];
  events: readonly QueryEvent[];
};

export function inspectQueryValue<T>(
  snapshot: string,
  key: string,
  codec: QueryCodec<T>,
  defaultValue?: T,
): QueryDecodeResult<T> {
  const raw = readQueryValues(snapshot, key);
  const events: QueryEvent[] = [{ type: 'read', key, hasValue: raw.length > 0 }];
  const value = codec.decode(raw);
  if (raw.length === 0 || value !== undefined) {
    return { value: value === undefined ? defaultValue : value, invalidEvents: [], events };
  }

  const category =
    raw.length > 1 && !codec.multiple ? 'duplicate' : raw.some((item) => item === '') ? 'empty' : 'malformed';
  const invalidEvent: QueryInvalidEvent = { key, rawValues: raw, category };
  events.push({ type: 'decode-fallback', key, category });
  return { value: defaultValue, invalidEvents: [invalidEvent], events };
}

export function reportQueryDiagnostics(
  result: Pick<QueryDecodeResult<unknown>, 'events' | 'invalidEvents'>,
  options: Pick<QueryStateOptions<unknown>, 'onEvent' | 'onInvalid'>,
): void {
  const pendingInvalid = [...result.invalidEvents];
  for (const event of result.events) {
    if (event.type === 'decode-fallback') {
      const index = pendingInvalid.findIndex(
        (invalid) => invalid.key === event.key && invalid.category === event.category,
      );
      if (index >= 0) options.onInvalid?.(pendingInvalid.splice(index, 1)[0]!);
    }
    options.onEvent?.(event);
  }
  for (const event of pendingInvalid) options.onInvalid?.(event);
}

export function decodeQueryValue<T>(
  snapshot: string,
  key: string,
  codec: QueryCodec<T>,
  options: QueryStateOptions<T> = {},
): T | undefined {
  const result = inspectQueryValue(snapshot, key, codec, options.defaultValue);
  reportQueryDiagnostics(result, options);
  return result.value;
}

function equalQueryValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function encodeQueryValue<T>(
  codec: QueryCodec<T>,
  value: T | undefined,
  defaultValue: T | undefined,
): readonly string[] | undefined {
  if (value === undefined) return undefined;
  const encoded = codec.encode(value);
  if (defaultValue === undefined) return encoded;
  return equalQueryValues(encoded, codec.encode(defaultValue)) ? undefined : encoded;
}

export function createQueryState<T>(
  source: QuerySource,
  key: string,
  codec: QueryCodec<T>,
  options: QueryStateOptions<T> = {},
): QueryStateController<T> {
  const get = (): T | undefined => decodeQueryValue(source.getSnapshot(), key, codec, options);
  const write = (value: T | undefined) => {
    const nextValues = encodeQueryValue(codec, value, options.defaultValue);
    const next = updateQueryValues(source.getSnapshot(), new Map([[key, nextValues]]));
    const mode: HistoryMode = options.history ?? 'replace';
    emit(options, { type: 'navigation-mode', mode });
    emit(options, { type: 'write', keys: [key], mode });
    source.navigate(next, mode);
  };
  return {
    get,
    set(value) {
      const current = get();
      const nextValue = typeof value === 'function' ? (value as (current: T | undefined) => T)(current) : value;
      write(nextValue);
    },
    reset: () => write(undefined),
    subscribe: source.subscribe,
  };
}

export function updateQueryStates(
  source: QuerySource,
  updates: ReadonlyMap<string, readonly string[] | undefined>,
  mode: HistoryMode = 'replace',
  onEvent?: QueryEventListener,
): void {
  onEvent?.({ type: 'navigation-mode', mode });
  onEvent?.({ type: 'write', keys: [...updates.keys()], mode });
  source.navigate(updateQueryValues(source.getSnapshot(), updates), mode);
}
