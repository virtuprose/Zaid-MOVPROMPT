import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, FolderOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { CreatorShell } from "@/features/create/CreatorShell";
import { getCreatorTemplate } from "@/features/create/templates";
import { duplicateCreatorProject, listLocalCreatorProjects, loadCreatorProjects, subscribeToCreatorProjects, trashCreatorProject } from "@/features/create/projectStore";
import type { CreatorProject } from "@/features/create/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function statusLabel(status: CreatorProject["status"]) {
  if (status === "review") return "Ready to review";
  if (status === "generating") return "Generating";
  if (status === "completed") return "Exported";
  if (status === "failed") return "Needs attention";
  return "Draft";
}

export default function CreatorProjects({ qaMode = false }: { qaMode?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<CreatorProject[]>([]);
  const [pendingDelete, setPendingDelete] = useState<CreatorProject | null>(null);

  useEffect(() => {
    void loadCreatorProjects(qaMode ? null : user?.id).then(setProjects);
    return subscribeToCreatorProjects(() => setProjects(listLocalCreatorProjects(qaMode ? null : user?.id)));
  }, [qaMode, user?.id]);

  const duplicate = async (project: CreatorProject) => {
    try {
      await duplicateCreatorProject(project.id, qaMode ? null : user?.id);
      setProjects(await loadCreatorProjects(qaMode ? null : user?.id));
      toast.success("Project duplicated.");
    } catch {
      toast.error("We couldn’t duplicate this project. Try again.");
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await trashCreatorProject(pendingDelete.id, qaMode ? null : user?.id);
      setProjects(await loadCreatorProjects(qaMode ? null : user?.id));
      setPendingDelete(null);
      toast.success("Project moved to trash.");
    } catch {
      toast.error("We couldn’t move this project to trash. Try again.");
    }
  };

  const createNew = () => {
    navigate(qaMode ? "/qa/create" : "/create");
  };

  return (
    <CreatorShell qaMode={qaMode}>
      <Seo title="Your video projects · MovPrompt" description="Continue, edit and export your MovPrompt campaigns." path="/projects" noindex />
      <div className="creator-page">
        <header className="creator-page-head">
          <div>
            <p className="creator-kicker">Your campaigns</p>
            <h1 className="creator-title creator-title-sm">Projects stay editable.</h1>
            <p className="creator-subtitle">Continue a draft, revise a generated campaign or create a version for another platform.</p>
          </div>
          <button className="creator-button creator-button-primary" type="button" onClick={createNew}><Plus aria-hidden="true" /> New project</button>
        </header>

        {projects.length ? (
          <div className="creator-project-grid">
            {projects.map((project) => {
              const template = getCreatorTemplate(project.templateId);
              return (
                <article className="creator-project-card" key={project.id}>
                  <Link to={qaMode ? `/qa/create?project=${project.id}` : `/projects/${project.id}`} className="creator-project-preview" aria-label={`Open ${project.title}`}>
                    <img src={project.product.images[0]?.url || template.poster} alt="" />
                    <span className="creator-project-status">{statusLabel(project.status)}</span>
                  </Link>
                  <div className="creator-project-copy">
                    <h2>{project.title}</h2>
                    <p>{template.name} · {project.aspectRatio} · Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                    <div className="creator-project-actions">
                      <Link className="creator-button creator-button-secondary" to={qaMode ? `/qa/create?project=${project.id}` : `/projects/${project.id}`}>Open</Link>
                      <button className="creator-icon-button" type="button" onClick={() => void duplicate(project)} aria-label={`Duplicate ${project.title}`}><Copy aria-hidden="true" /></button>
                      <button className="creator-icon-button" type="button" onClick={() => setPendingDelete(project)} aria-label={`Move ${project.title} to trash`}><Trash2 aria-hidden="true" /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="creator-empty">
            <div><span className="creator-empty-icon"><FolderOpen aria-hidden="true" /></span><h2>No campaigns yet</h2><p>Choose a template and add a product. MovPrompt will save your work automatically.</p><button className="creator-button creator-button-primary" type="button" onClick={createNew}><Plus aria-hidden="true" /> Create your first video</button></div>
          </div>
        )}
      </div>
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move this project to trash?</AlertDialogTitle><AlertDialogDescription>“{pendingDelete?.title}” will leave your project list but remains recoverable during the trash retention period.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep project</AlertDialogCancel><AlertDialogAction onClick={() => void remove()}>Move to trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </CreatorShell>
  );
}
