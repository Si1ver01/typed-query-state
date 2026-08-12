import { StrictMode, useState, type PropsWithChildren } from 'react';
import { renderHook, act } from '@testing-library/react';
import { createMemoryQuerySource } from '../src/core/memory-source.js';
import { arrayCodec, numberCodec, stringCodec } from '../src/codecs/index.js';
import { useQueryState } from '../src/react/use-query-state.js';
import { useQueryStates } from '../src/react/use-query-states.js';

describe('React hooks', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('reads and updates a typed state through an injected source', () => {
    const source = createMemoryQuerySource('/?page=2');
    const result = renderHook(() => useQueryState('page', numberCodec, { source, defaultValue: 1 }));
    expect(result.result.current[0]).toBe(2);
    act(() => result.result.current[1]((current) => (current ?? 0) + 1));
    expect(result.result.current[0]).toBe(3);
    expect(source.getSnapshot()).toBe('/?page=3');
  });

  it('updates several keys in one navigation', () => {
    const source = createMemoryQuerySource('/?page=1');
    const result = renderHook(() =>
      useQueryStates(
        {
          page: { codec: numberCodec, defaultValue: 1 },
          query: { codec: stringCodec, defaultValue: '' },
        },
        { source },
      ),
    );
    act(() => result.result.current[1]({ page: 2, query: 'docs' }));
    expect(source.getSnapshot()).toBe('/?page=2&query=docs');
  });

  it('keeps separate hooks synchronized through the default browser source', () => {
    window.history.replaceState({}, '', '/?page=1');
    const first = renderHook(() => useQueryState('page', numberCodec, { defaultValue: 1 }));
    const second = renderHook(() => useQueryState('page', numberCodec, { defaultValue: 1 }));

    act(() => first.result.current[1](2));

    expect(second.result.current[0]).toBe(2);
  });

  it('keeps decoded array snapshots stable between source updates', () => {
    const source = createMemoryQuerySource('/?tag=a&tag=b');
    const tagsCodec = arrayCodec(stringCodec);
    const result = renderHook(() => useQueryState('tag', tagsCodec, { source, defaultValue: [] }));

    expect(result.result.current[0]).toEqual(['a', 'b']);
    act(() => result.result.current[1]((tags) => [...(tags ?? []), 'c']));
    expect(result.result.current[0]).toEqual(['a', 'b', 'c']);
  });

  it('re-decodes state when definitions change without a URL update', () => {
    const source = createMemoryQuerySource('/');
    const result = renderHook(
      ({ defaultPage }) => useQueryStates({ page: { codec: numberCodec, defaultValue: defaultPage } }, { source }),
      { initialProps: { defaultPage: 1 } },
    );

    expect(result.result.current[0].page).toBe(1);
    result.rerender({ defaultPage: 2 });
    expect(result.result.current[0].page).toBe(2);
  });

  it('removes structured defaults in an atomic multi-state update', () => {
    const source = createMemoryQuerySource('/?tag=custom');
    const tagsCodec = arrayCodec(stringCodec);
    const result = renderHook(() => useQueryStates({ tag: { codec: tagsCodec, defaultValue: ['all'] } }, { source }));

    act(() => result.result.current[1]({ tag: ['all'] }));

    expect(source.getSnapshot()).toBe('/');
    expect(result.result.current[0].tag).toEqual(['all']);
  });

  it('reports invalid multi-state values through the shared diagnostics contract', () => {
    const source = createMemoryQuerySource('/?page=1&page=2');
    const onInvalid = vi.fn();
    const onEvent = vi.fn();
    const result = renderHook(() =>
      useQueryStates({ page: { codec: numberCodec, defaultValue: 1 } }, { source, onInvalid, onEvent }),
    );

    expect(result.result.current[0].page).toBe(1);
    expect(onInvalid).toHaveBeenCalledWith({
      key: 'page',
      rawValues: ['1', '2'],
      category: 'duplicate',
    });
    expect(onEvent).toHaveBeenCalledWith({ type: 'decode-fallback', key: 'page', category: 'duplicate' });

    act(() => result.result.current[1]({ page: 3 }));
    expect(onEvent).toHaveBeenCalledWith({ type: 'navigation-mode', mode: 'replace' });
    expect(onEvent).toHaveBeenCalledWith({ type: 'write', keys: ['page'], mode: 'replace' });
  });

  it('delivers diagnostics once after a Strict Mode commit', () => {
    const source = createMemoryQuerySource('/?page=invalid');
    const onInvalid = vi.fn();
    const onEvent = vi.fn();
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
    const result = renderHook(
      () => {
        const [, setInvalidCount] = useState(0);
        return useQueryState('page', numberCodec, {
          source,
          defaultValue: 1,
          onInvalid(event) {
            onInvalid(event);
            setInvalidCount((count) => count + 1);
          },
          onEvent,
        });
      },
      { wrapper },
    );

    expect(result.result.current[0]).toBe(1);
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onEvent.mock.calls.filter(([event]) => event.type === 'decode-fallback')).toHaveLength(1);
  });

  it('deduplicates multi-state diagnostics with inline definitions', () => {
    const source = createMemoryQuerySource('/?page=invalid');
    const onInvalid = vi.fn();
    const onEvent = vi.fn();
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
    const result = renderHook(
      () => {
        const [invalidCount, setInvalidCount] = useState(0);
        const [state] = useQueryStates(
          { page: { codec: numberCodec, defaultValue: 1 } },
          {
            source,
            onInvalid(event) {
              onInvalid(event);
              setInvalidCount((count) => count + 1);
            },
            onEvent,
          },
        );
        return { invalidCount, page: state.page };
      },
      { wrapper },
    );

    expect(result.result.current).toEqual({ invalidCount: 1, page: 1 });
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onEvent.mock.calls.filter(([event]) => event.type === 'decode-fallback')).toHaveLength(1);
  });
});
