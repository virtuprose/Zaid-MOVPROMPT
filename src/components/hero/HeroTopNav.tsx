import { Link } from "react-router-dom";
import logoMark from "@/assets/logo-mark-white.svg";

export const HeroTopNav = () => {
  return (
    <nav className="absolute top-0 inset-x-0 z-30 px-6 md:px-10 py-5 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-white">
        <img src={logoMark} alt="MovPrompt" className="w-7 h-7" />
        <span className="text-lg font-semibold tracking-tight">MovPrompt</span>
      </Link>
    </nav>
  );
};
