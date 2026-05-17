import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class DirectorErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[DirectorChat] crashed:", error, info);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl text-foreground mb-1">
          The Director hit a snag
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Something broke while rendering this chat. Your conversation is saved — try again or reload the page.
        </p>
        {this.state.error?.message && (
          <pre className="text-[11px] text-muted-foreground/70 bg-muted/30 rounded-md p-3 mb-6 max-w-md mx-auto overflow-auto text-left">
            {this.state.error.message}
          </pre>
        )}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={this.handleReset} className="rounded-full">
            Try again
          </Button>
          <Button onClick={this.handleReload} className="rounded-full gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </Button>
        </div>
      </div>
    );
  }
}
