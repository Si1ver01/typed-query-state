import { createMemoryQuerySource } from '../src/core/memory-source.js';
import { createQueryState, updateQueryStates } from '../src/core/query-state.js';
import { arrayCodec, numberCodec, stringCodec, type QueryCodec } from '../src/codecs/index.js';

describe('query state core', () => {
  it('preserves unrelated params, path and hash while resetting defaults', () => {
    const source = createMemoryQuerySource('/products?page=2&keep=yes#results');
    const state = createQueryState(source, 'page', numberCodec, { defaultValue: 1 });
    expect(state.get()).toBe(2);
    state.set(3);
    expect(source.getSnapshot()).toContain('/products?');
    expect(new URL(source.getSnapshot(), 'http://test').searchParams.get('page')).toBe('3');
    expect(new URL(source.getSnapshot(), 'http://test').searchParams.get('keep')).toBe('yes');
    state.reset();
    expect(source.getSnapshot()).toBe('/products?keep=yes#results');
  });

  it('updates multiple keys atomically and reports invalid input', () => {
    const source = createMemoryQuerySource('/search?query=%25&tag=a&tag=b');
    const invalid = vi.fn();
    const query = createQueryState(source, 'query', stringCodec, { onInvalid: invalid });
    expect(query.get()).toBe('%');
    updateQueryStates(
      source,
      new Map([
        ['query', ['next']],
        ['tag', arrayCodec(stringCodec).encode(['c', 'd'])],
      ]),
      'push',
    );
    expect(source.getSnapshot()).toBe('/search?query=next&tag=c&tag=d');
    expect(invalid).not.toHaveBeenCalled();
  });

  it('removes structured default values using their encoded representation', () => {
    const source = createMemoryQuerySource('/products?tag=custom');
    const state = createQueryState(source, 'tag', arrayCodec(stringCodec), { defaultValue: ['all'] });

    state.set(['all']);

    expect(source.getSnapshot()).toBe('/products');
  });

  it('reports duplicate scalar values and falls back without throwing', () => {
    const source = createMemoryQuerySource('/search?query=first&query=second');
    const onInvalid = vi.fn();
    const onEvent = vi.fn();
    const state = createQueryState(source, 'query', stringCodec, {
      defaultValue: 'fallback',
      onInvalid,
      onEvent,
    });

    expect(state.get()).toBe('fallback');
    expect(onInvalid).toHaveBeenCalledWith({
      key: 'query',
      rawValues: ['first', 'second'],
      category: 'duplicate',
    });
    expect(onEvent).toHaveBeenCalledWith({ type: 'decode-fallback', key: 'query', category: 'duplicate' });
  });

  it('preserves nullable codec values and diagnostic event order', () => {
    const nullableCodec: QueryCodec<string | null> = {
      decode: () => null,
      encode: (value) => [value ?? 'null'],
    };
    const source = createMemoryQuerySource('/?value=invalid');
    const order: string[] = [];
    const nullable = createQueryState(source, 'nullable', nullableCodec, { defaultValue: 'fallback' });
    const invalid = createQueryState(source, 'value', numberCodec, {
      onInvalid: () => order.push('invalid'),
      onEvent: (event) => order.push(event.type),
    });

    expect(nullable.get()).toBeNull();
    expect(invalid.get()).toBeUndefined();
    expect(order).toEqual(['read', 'invalid', 'decode-fallback']);
  });
});
