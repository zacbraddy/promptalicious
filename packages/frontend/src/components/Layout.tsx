import { Link } from "react-router-dom";
import { Rocket, Settings } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-3xl" aria-hidden="true">
              😋
            </span>
            <h1 className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              promptalicious
            </h1>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/execute"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Rocket className="h-5 w-5" />
              <span>Execute</span>
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
