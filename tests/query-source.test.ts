import { createMemoryQuerySource } from '../src/core/memory-source.js';

describe('memory source', () => {
  it('notifies subscribers and removes listeners', () => {
    const source = createMemoryQuerySource('/items?keep=yes');
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);
    source.navigate('/items?keep=no', 'replace');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    source.navigate('/items?keep=again', 'push');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
