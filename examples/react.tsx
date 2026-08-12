import { enumCodec, numberCodec } from '@ddanshin94/typed-query-state/codecs';
import { useQueryState, useQueryStates } from '@ddanshin94/typed-query-state/react';

const sortCodec = enumCodec(['newest', 'popular'] as const);

export function SearchControls() {
  const [page, setPage] = useQueryState('page', numberCodec, { defaultValue: 1 });
  const [state, setState] = useQueryStates({ sort: { codec: sortCodec, defaultValue: 'newest' } });
  return (
    <button
      onClick={() => {
        setPage((value) => (value ?? 1) + 1);
        setState({ sort: state.sort === 'newest' ? 'popular' : 'newest' });
      }}
    >
      Page {page}: {state.sort}
    </button>
  );
}
