import { Bell } from "lucide-react";
import { Seo } from "@/components/Seo";
import { CreatorShell } from "@/features/create/CreatorShell";

export default function Notifications() {
  return <CreatorShell><Seo title="Notifications · MovPrompt" description="Generation, export and account updates." noindex /><div className="creator-page"><header className="creator-page-head"><div><p className="creator-kicker">Updates</p><h1 className="creator-title creator-title-sm">Notifications</h1><p className="creator-subtitle">Render and export updates will appear here and in the workspace notification menu.</p></div></header><div className="creator-empty"><div><span className="creator-empty-icon"><Bell aria-hidden="true" /></span><h2>You’re all caught up</h2><p>New generation, export and billing updates will appear here.</p></div></div></div></CreatorShell>;
}
