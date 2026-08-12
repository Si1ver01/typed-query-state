export type HistoryMode = 'replace' | 'push';

export type CodecErrorCategory = 'missing' | 'empty' | 'malformed' | 'duplicate';

export type QueryCodec<T> = {
  decode(values: readonly string[]): T | undefined;
  encode(value: T): readonly string[];
  multiple?: boolean;
};

export type QueryInvalidEvent = {
  key: string;
  rawValues: readonly string[];
  category: CodecErrorCategory;
};

export type QueryEvent =
  | { type: 'read'; key: string; hasValue: boolean }
  | { type: 'write'; keys: readonly string[]; mode: HistoryMode }
  | { type: 'decode-fallback'; key: string; category: CodecErrorCategory }
  | { type: 'navigation-mode'; mode: HistoryMode };

export type QueryEventListener = (event: QueryEvent) => void;

export type QuerySource = {
  getSnapshot(): string;
  subscribe(listener: () => void): () => void;
  navigate(url: string, mode: HistoryMode): void;
};

export type QueryStateOptions<T> = {
  defaultValue?: T;
  history?: HistoryMode;
  onInvalid?: (event: QueryInvalidEvent) => void;
  onEvent?: QueryEventListener;
};

export type UseQueryStateOptions<T> = QueryStateOptions<T> & {
  source?: QuerySource;
  serverSnapshot?: string;
};

export type UseQueryStatesOptions = Omit<UseQueryStateOptions<unknown>, 'defaultValue'>;

export type QueryStateDefinition<T> = {
  codec: QueryCodec<T>;
  defaultValue?: T;
};

export type QueryStateDefinitions = Record<string, QueryStateDefinition<unknown>>;
