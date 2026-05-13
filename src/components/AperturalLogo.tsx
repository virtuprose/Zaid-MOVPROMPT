interface Props {
  size?: number;
  className?: string;
}

/**
 * MovPrompt camera-aperture mark: an "M" inside a circular aperture.
 * Amber blades, white M.
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
    {/* Outer ring */}
    <circle cx="16" cy="16" r="14" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    {/* Aperture blades — 6 triangular wedges */}
    <g stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.55" fill="none">
      <path d="M16 4 L21 13 L16 16 Z" />
      <path d="M26.4 10 L21 13 L24 18 Z" />
      <path d="M26.4 22 L21 19 L24 14 Z" />
      <path d="M16 28 L11 19 L16 16 Z" />
      <path d="M5.6 22 L11 19 L8 14 Z" />
      <path d="M5.6 10 L11 13 L8 18 Z" />
    </g>
    {/* Center M */}
    <path
      d="M11 21 L11 11 L13 11 L16 16 L19 11 L21 11 L21 21 L19 21 L19 14.5 L16.5 18.5 L15.5 18.5 L13 14.5 L13 21 Z"
      fill="hsl(var(--foreground))"
    />
  </svg>
);
