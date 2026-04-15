import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />
      </div>
      <div className="text-center relative z-10">
        <h1 className="mb-4 text-5xl font-display font-bold text-foreground">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
