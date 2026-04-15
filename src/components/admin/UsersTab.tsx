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
import { Pencil, Download, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  role: "admin" | "user";
}

const UsersTab = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

    const roleMap: Record<string, "admin" | "user"> = {};
    (roles || []).forEach((r) => {
      if (r.role === "admin") roleMap[r.user_id] = "admin";
    });

    const merged: UserRow[] = (profiles || []).map((p) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      role: roleMap[p.id] || "user",
    }));

    setUsers(merged);
    setLoading(false);
  };

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setEditName(user.display_name || "");
    setEditRole(user.role);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);

    try {
      // Update display name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: editName })
        .eq("id", editUser.id);

      if (profileError) throw profileError;

      // Handle role change
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
        <Button variant="outline" size="sm" onClick={() => {
          const lines: string[] = [
            "=== MovPrompt Users Report ===", "",
            "Name,Email,Role,Joined",
            ...users.map((u) => `"${(u.display_name || "—").replace(/"/g, '""')}","${u.email || "—"}","${u.role}","${u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}"`),
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
          <CardTitle className="text-sm font-medium">All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
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
