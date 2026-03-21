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
  const initialBad = !src || String(src).trim() === '';
  const [usePlaceholder, setUsePlaceholder] = useState(initialBad);

  const onError = useCallback(() => {
    setUsePlaceholder(true);
  }, []);

  return (
    <img
      src={usePlaceholder ? placeholderSrc : String(src)}
      alt={alt}
      className={className}
      loading={loading}
      onError={onError}
    />
  );
}
