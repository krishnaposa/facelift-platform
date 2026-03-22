'use client';

import { useCallback, useState } from 'react';
import { IMAGE_PLACEHOLDER_DATA_URL } from '@/lib/image-placeholder';

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  /** Optional override if the default SVG is not desired */
  placeholderSrc?: string;
};

/**
 * Falls back to an inline SVG placeholder when `src` is missing or fails to load.
 */
export default function SafeImage({
  src,
  alt,
  className,
  loading = 'lazy',
  placeholderSrc = IMAGE_PLACEHOLDER_DATA_URL,
}: Props) {
  /** Only flip after a real load error — initial src is derived from props so SSR and hydration match. */
  const [loadFailed, setLoadFailed] = useState(false);
  const trimmed = src != null ? String(src).trim() : '';
  const usePlaceholder = loadFailed || trimmed.length === 0;
  const imgSrc = usePlaceholder ? placeholderSrc : trimmed;

  const onError = useCallback(() => {
    setLoadFailed(true);
  }, []);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={onError}
    />
  );
}
