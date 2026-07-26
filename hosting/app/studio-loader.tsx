'use client';

import { useEffect } from 'react';

export function StudioLoader({ source }: { source: string }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = source;
    script.crossOrigin = 'anonymous';
    document.body.append(script);

    return () => script.remove();
  }, [source]);

  return null;
}
