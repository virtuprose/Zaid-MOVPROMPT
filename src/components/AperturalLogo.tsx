interface Props {
  size?: number;
  className?: string;
}

/**
 * MovPrompt mark: amber asymmetric triangular wedge.
 * Top edge horizontal, sharp point at lower-left.
 */
export const AperturalLogo = ({ size = 28, className }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M14 7 L23 7 L9 27 Z"
      fill="hsl(var(--accent))"
    />
  </svg>
);
