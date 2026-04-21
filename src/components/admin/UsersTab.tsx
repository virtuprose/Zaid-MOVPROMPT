import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil, Download, Search, ChevronLeft, ChevronRight, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Sparkline from "./Sparkline";

interface UserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  role: "admin" | "user";
  is_active: boolean;
  generations: number;
  trend: number[];
}

const UsersTab = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      if (!matchesRole) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (u.display_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    });
  }, [users, searchQuery, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: profiles }, { data: roles }, { data: events }, { data: history }, { data: recentEvents }] =
      await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("generation_events").select("user_id"),
        supabase.from("prompt_history").select("user_id"),
        supabase.from("generation_events").select("user_id, created_at").gte("created_at", thirtyDaysAgo),
      ]);

    const roleMap: Record<string, "admin" | "user"> = {};
    (roles || []).forEach((r) => {
      if (r.role === "admin") roleMap[r.user_id] = "admin";
    });

    const eventCount: Record<string, number> = {};
    (events || []).forEach((e) => {
      if (e.user_id) eventCount[e.user_id] = (eventCount[e.user_id] || 0) + 1;
    });
    const historyCount: Record<string, number> = {};
    (history || []).forEach((h) => {
      historyCount[h.user_id] = (historyCount[h.user_id] || 0) + 1;
    });
    const genCount: Record<string, number> = {};
    new Set([...Object.keys(eventCount), ...Object.keys(historyCount)]).forEach((uid) => {
      genCount[uid] = Math.max(eventCount[uid] || 0, historyCount[uid] || 0);
    });

    // Build per-user 30-day daily trend buckets
    const now = new Date();
    const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const trendMap: Record<string, number[]> = {};
    (recentEvents || []).forEach((e) => {
      if (!e.user_id || !e.created_at) return;
      const d = new Date(e.created_at);
      const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const idx = 29 - Math.floor((todayKey - dayKey) / (24 * 60 * 60 * 1000));
      if (idx < 0 || idx > 29) return;
      if (!trendMap[e.user_id]) trendMap[e.user_id] = new Array(30).fill(0);
      trendMap[e.user_id][idx]++;
    });

    const merged: UserRow[] = (profiles || []).map((p) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      role: roleMap[p.id] || "user",
      is_active: true,
      generations: genCount[p.id] || 0,
      trend: trendMap[p.id] || new Array(30).fill(0),
    }));

    setUsers(merged);
    setLoading(false);
  };

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setEditName(user.display_name || "");
    setEditRole(user.role);
    setEditActive(user.is_active);
  };

  const handleToggleStatus = async (activate: boolean) => {
    if (!editUser) return;
    setTogglingStatus(true);

    try {
      const { data, error } = await supabase.functions.invoke("toggle-user-status", {
        body: { userId: editUser.id, ban: !activate },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setEditActive(activate);
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, is_active: activate } : u))
      );
      setEditUser((prev) => prev ? { ...prev, is_active: activate } : prev);

      toast({
        title: activate ? "User activated" : "User deactivated",
        description: activate
          ? "The user can now sign in."
          : "The user has been blocked from signing in.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: editName })
        .eq("id", editUser.id);

      if (profileError) throw profileError;

      if (editRole !== editUser.role) {
        if (editRole === "admin") {
          const { error } = await supabase
            .from("user_roles")
            .insert({ user_id: editUser.id, role: "admin" });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", editUser.id)
            .eq("role", "admin");
          if (error) throw error;
        }
      }

      toast({ title: "User updated" });
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground animate-pulse py-8 text-center">Loading users...</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | "admin" | "user")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => {
          const lines: string[] = [
            "=== MovPrompt Users Report ===", "",
            "Name,Email,Role,Generations,Status,Joined",
            ...users.map((u) => `"${(u.display_name || "—").replace(/"/g, '""')}","${u.email || "—"}","${u.role}","${u.generations}","${u.is_active ? "Active" : "Deactivated"}","${u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}"`),
          ];
          const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `movprompt-users-${new Date().toISOString().split("T")[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }} className="gap-2">
          <Download className="w-4 h-4" />
          Download Report
        </Button>
      </div>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">All Users ({filteredUsers.length}{searchQuery ? ` of ${users.length}` : ""})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Generations</TableHead>
                <TableHead>30-day trend</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((u) => (
                <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.generations > 0 ? (
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary font-medium">
                        {u.generations}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Sparkline data={u.trend} />
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                        <ShieldOff className="w-3 h-3 mr-1" />
                        Deactivated
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">{editUser?.email}</p>
            </div>
            <div>
              <Label htmlFor="edit-name">Display Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as "admin" | "user")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Account Status</Label>
                <p className="text-xs text-muted-foreground">
                  {editActive
                    ? "User can sign in and use the app."
                    : "User is blocked from signing in."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${editActive ? "text-emerald-400" : "text-destructive"}`}>
                  {editActive ? "Active" : "Deactivated"}
                </span>
                <Switch
                  checked={editActive}
                  onCheckedChange={(checked) => handleToggleStatus(checked)}
                  disabled={togglingStatus}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersTab;
