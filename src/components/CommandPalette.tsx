import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Folder, HelpCircle, Megaphone, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Tab = "tasks" | "library" | "help";

type TaskHit = { id: string; title: string | null; updated_at: string };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("tasks");
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<TaskHit[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("director_sessions")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (active && data) setTasks(data as TaskHit[]);
    })();
    return () => {
      active = false;
    };
  }, [open, user]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => (t.title || "").toLowerCase().includes(q));
  }, [tasks, query]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search tasks, prompts, references..."
        value={query}
        onValueChange={setQuery}
      />
      <div className="px-3 pt-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
            <TabsTrigger value="library" className="text-xs">Library</TabsTrigger>
            <TabsTrigger value="help" className="text-xs">Help</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <CommandList className="max-h-[400px]">
        {tab === "tasks" && (
          <>
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => go("/director")}>
                <Plus className="w-4 h-4 mr-2" /> New AI Director task
              </CommandItem>
              <CommandItem onSelect={() => go("/marketing")}>
                <Megaphone className="w-4 h-4 mr-2" /> New Ads brief
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Recent tasks">
              {filteredTasks.length === 0 && <CommandEmpty>No tasks found.</CommandEmpty>}
              {filteredTasks.map((t) => (
                <CommandItem key={t.id} onSelect={() => go(`/director/${t.id}`)}>
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="truncate">{t.title || "Untitled brief"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {tab === "library" && (
          <CommandGroup heading="Library">
            <CommandItem onSelect={() => go("/library")}>
              <Folder className="w-4 h-4 mr-2" /> Open Library
            </CommandItem>
            <CommandEmpty>Search across your library — coming soon.</CommandEmpty>
          </CommandGroup>
        )}
        {tab === "help" && (
          <CommandGroup heading="Help">
            <CommandItem onSelect={() => go("/learn")}>
              <HelpCircle className="w-4 h-4 mr-2" /> Learn center
            </CommandItem>
            <CommandItem onSelect={() => go("/director")}>
              <Sparkles className="w-4 h-4 mr-2" /> Take the tour
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
