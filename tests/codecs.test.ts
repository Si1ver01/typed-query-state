import { arrayCodec, booleanCodec, enumCodec, numberCodec, stringCodec } from '../src/codecs/index.js';

describe('codecs', () => {
  it('round-trips strings including an explicit empty value', () => {
    expect(stringCodec.decode(stringCodec.encode(''))).toBe('');
    expect(stringCodec.decode([])).toBeUndefined();
  });

  it('rejects malformed numbers and booleans', () => {
    expect(numberCodec.decode(['nope'])).toBeUndefined();
    expect(numberCodec.decode([''])).toBeUndefined();
    expect(booleanCodec.decode(['maybe'])).toBeUndefined();
    expect(booleanCodec.decode(['1'])).toBe(true);
  });

  it('rejects non-finite numbers during encoding', () => {
    expect(() => numberCodec.encode(Number.NaN)).toThrow(RangeError);
    expect(() => numberCodec.encode(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => numberCodec.encode(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it('restricts enum values and supports duplicate arrays', () => {
    const color = enumCodec(['red', 'blue'] as const);
    expect(color.decode(['green'])).toBeUndefined();
    const tags = arrayCodec(stringCodec);
    expect(tags.decode(['a', 'b'])).toEqual(['a', 'b']);
    expect(tags.encode(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('rejects duplicate values for every scalar codec', () => {
    const color = enumCodec(['red', 'blue'] as const);
    expect(stringCodec.decode(['a', 'b'])).toBeUndefined();
    expect(numberCodec.decode(['1', '2'])).toBeUndefined();
    expect(booleanCodec.decode(['true', 'false'])).toBeUndefined();
    expect(color.decode(['red', 'blue'])).toBeUndefined();
  });
});
