interface Props {
  size?: number;
  className?: string;
}

/**
 * MovPrompt mark: an amber slanted wedge / cinematic slash.
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
      d="M22 3.5 L26 3.5 L12.5 28.5 L6 28.5 Z"
      fill="hsl(var(--accent))"
    />
  </svg>
);
