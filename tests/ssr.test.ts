// @vitest-environment node

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { numberCodec, stringCodec } from '../src/codecs/index.js';
import { useQueryState } from '../src/react/use-query-state.js';
import { useQueryStates } from '../src/react/use-query-states.js';

describe('SSR safety', () => {
  it('does not reference browser globals at module evaluation', async () => {
    const module = await import('../src/index.js');
    expect(module.createMemoryQuerySource('/')).toBeDefined();
  });

  it('renders useQueryState with a stable server snapshot', () => {
    function Page() {
      const [page] = useQueryState('page', numberCodec, { serverSnapshot: '/products?page=2' });
      return createElement('span', null, page);
    }

    expect(renderToString(createElement(Page))).toBe('<span>2</span>');
  });

  it('renders useQueryStates with a stable server snapshot', () => {
    function Search() {
      const [state] = useQueryStates(
        {
          page: { codec: numberCodec, defaultValue: 1 },
          query: { codec: stringCodec, defaultValue: '' },
        },
        { serverSnapshot: '/search?page=3&query=docs' },
      );
      return createElement('span', null, `${state.query}:${state.page}`);
    }

    expect(renderToString(createElement(Search))).toBe('<span>docs:3</span>');
  });
});
