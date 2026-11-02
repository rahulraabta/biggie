'use client';

import { useEffect, useRef, useState } from 'react';
import type { OpportunityResponseItem } from '../app/api/opportunities/route';

interface RealtimeOptions {
  accept?: (opportunity: OpportunityResponseItem) => boolean;
  onInsert?: (opportunities: OpportunityResponseItem[]) => void;
  onConnect?: () => void;
}

export function useRealtimeOpportunities(options: RealtimeOptions = {}) {
  const [opportunities, setOpportunities] = useState<OpportunityResponseItem[]>([]);
  const [status, setStatus] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  useEffect(() => {
    let disposed = false;
    const source = new EventSource('/api/opportunities/stream');
    source.onopen = () => {
      if (disposed) return;
      setStatus('live');
      optionsRef.current.onConnect?.();
    };
    source.onmessage = (event) => {
      if (disposed) return;
      let incoming: OpportunityResponseItem[];
      try {
        const parsed = JSON.parse(event.data);
        incoming = (Array.isArray(parsed) ? parsed : [parsed]).filter((item) =>
          item && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.title === 'string'
        );
      } catch { return; }
      const accepted = incoming.filter((item) => optionsRef.current.accept?.(item) ?? true);
      if (accepted.length) {
        setOpportunities((previous) => {
          const ids = new Set(previous.map((item) => item.id));
          return [...previous, ...accepted.filter((item) => {
            if (ids.has(item.id)) return false;
            ids.add(item.id);
            return true;
          })];
        });
      }
      if (incoming.length) optionsRef.current.onInsert?.(accepted);
    };
    source.onerror = () => { if (!disposed) setStatus('reconnecting'); };
    return () => {
      disposed = true;
      source.onopen = null;
      source.onmessage = null;
      source.onerror = null;
      source.close();
    };
  }, []);
  return { opportunities, setOpportunities, status };
}
