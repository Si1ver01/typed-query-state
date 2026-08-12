import type { QueryCodec } from '../shared/types.js';

function singleValue(values: readonly string[]): string | undefined {
  return values.length === 1 ? values[0] : undefined;
}

export const stringCodec: QueryCodec<string> = {
  decode(values) {
    return singleValue(values);
  },
  encode(value) {
    return [value];
  },
};

export const numberCodec: QueryCodec<number> = {
  decode(values) {
    const value = singleValue(values);
    if (value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  },
  encode(value) {
    if (!Number.isFinite(value)) {
      throw new RangeError('numberCodec can only encode finite numbers');
    }
    return [String(value)];
  },
};

export const booleanCodec: QueryCodec<boolean> = {
  decode(values) {
    const value = singleValue(values);
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
  },
  encode(value) {
    return [value ? 'true' : 'false'];
  },
};

export function enumCodec<const T extends string>(values: readonly T[]): QueryCodec<T> {
  const allowed = new Set(values);
  return {
    decode(rawValues) {
      const value = singleValue(rawValues);
      return value !== undefined && allowed.has(value as T) ? (value as T) : undefined;
    },
    encode(value) {
      return [value];
    },
  };
}

export function arrayCodec<T>(itemCodec: QueryCodec<T>): QueryCodec<T[]> {
  return {
    multiple: true,
    decode(values) {
      if (values.length === 0) return undefined;
      const decoded = values.map((value) => itemCodec.decode([value]));
      return decoded.some((value) => value === undefined) ? undefined : (decoded as T[]);
    },
    encode(value) {
      return value.flatMap((item) => [...itemCodec.encode(item)]);
    },
  };
}

export type { QueryCodec } from '../shared/types.js';
