import { useEffect, useRef } from 'react';
import type { QueryDecodeResult } from '../core/query-state.js';
import { reportQueryDiagnostics } from '../core/query-state.js';
import type { QueryStateOptions } from '../shared/types.js';

type Diagnostics = Pick<QueryDecodeResult<unknown>, 'events' | 'invalidEvents'>;

function diagnosticsKey(diagnostics: Diagnostics): string {
  return JSON.stringify([diagnostics.events, diagnostics.invalidEvents]);
}

export function useQueryDiagnostics(
  diagnostics: Diagnostics,
  options: Pick<QueryStateOptions<unknown>, 'onEvent' | 'onInvalid'>,
): void {
  const deliveredKey = useRef<string | undefined>(undefined);
  const key = diagnosticsKey(diagnostics);

  useEffect(() => {
    if (deliveredKey.current === key) return;
    deliveredKey.current = key;
    reportQueryDiagnostics(diagnostics, options);
  }, [diagnostics, key, options.onEvent, options.onInvalid]);
}
