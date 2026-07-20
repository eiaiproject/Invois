import type { IconFunction } from 'reicon';

interface ReiconProps {
  readonly icon: IconFunction;
  readonly size?: number;
  readonly className?: string;
}

export function Reicon({ icon, size = 24, className = '' }: ReiconProps) {
  return (
    <span
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: icon.toSvg({ size, className }),
      }}
    />
  );
}
