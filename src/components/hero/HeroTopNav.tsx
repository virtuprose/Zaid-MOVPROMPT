import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import logoMark from "@/assets/logo-mark-white.svg";

const LINKS = [
  { label: "Create", to: "/director" },
  { label: "Models", to: "/gallery" },
  { label: "Library", to: "/library" },
  { label: "Learn", to: "/learn" },
];

export const HeroTopNav = () => {
  return (
    <nav className="absolute top-0 inset-x-0 z-30 px-6 md:px-10 py-5 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-white">
        <img src={logoMark} alt="VidoPrompt" className="w-7 h-7" />
        <span className="text-lg font-semibold tracking-tight">VidoPrompt</span>
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
        <Link
          to="/account/billing"
          className="text-sm font-medium text-[hsl(var(--magnific-accent))] hover:opacity-80 transition-opacity"
        >
          Upgrade
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 text-sm text-white/70 min-w-[220px]">
          <Search className="w-4 h-4" />
          <span>Search or create</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(var(--magnific-accent))] to-amber-500 ring-2 ring-white/40" />
      </div>
    </nav>
  );
};
