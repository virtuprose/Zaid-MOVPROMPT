import { Link } from "react-router-dom";
import logoMark from "@/assets/logo-mark-white.svg";

const LINKS = [
  { label: "Create", to: "/director" },
  { label: "Models", to: "/gallery" },
  { label: "Library", to: "/library" },
];

export const HeroTopNav = () => {
  return (
    <nav className="absolute top-0 inset-x-0 z-30 px-6 md:px-10 py-5 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-white">
        <img src={logoMark} alt="MovPrompt" className="w-7 h-7" />
        <span className="text-lg font-semibold tracking-tight">MovPrompt</span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {LINKS.map((l) => (
          <Link
            key={l.label}
            to={l.to}
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};
