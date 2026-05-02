"use client";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/cpa/ui/button";
import { Input } from "@/components/cpa/ui/input";
import { Label } from "@/components/cpa/ui/label";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/cpa/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/cpa/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/cpa/ui/dialog";
import { formatDate } from "@/lib/cpa/format";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "viewer";
  created_at: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return res.json();
};

const ROLE_LABELS: Record<string, string> = {
  admin: "מנהל",
  manager: "מנהל חשבון",
  viewer: "צופה",
};

export function UsersTab() {
  const { data: usersRaw, isLoading, error, mutate } =
    useSWR("/api/cpa/users", fetcher);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const users: User[] = Array.isArray(usersRaw?.data) ? usersRaw.data : [];

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      toast.error("יש להזין כתובת מייל");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/cpa/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
        }),
      });
      if (!res.ok) throw new Error("שגיאה בהזמנת משתמש");
      toast.success("ההזמנה נשלחה בהצלחה");
      setInviteEmail("");
      setInviteName("");
      setInviteRole("viewer");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהזמנת משתמש");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/cpa/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (!res.ok) throw new Error("שגיאה בעדכון תפקיד");
      toast.success("התפקיד עודכן בהצלחה");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בעדכון תפקיד");
    }
  }

  async function handleDelete(userId: string) {
    setDeletingId(userId);
    try {
      const res = await fetch("/api/cpa/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      if (!res.ok) throw new Error("שגיאה במחיקת משתמש");
      toast.success("המשתמש הוסר בהצלחה");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה במחיקת משתמש");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-8 text-center">
        <p className="text-red-600">שגיאה בטעינת משתמשים</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold">הזמן משתמש</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="invite-email" className="text-muted-foreground text-xs">מייל</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              dir="ltr"
              className="bg-neutral-50"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="invite-name" className="text-muted-foreground text-xs">שם</Label>
            <Input
              id="invite-name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="שם המשתמש"
              className="bg-neutral-50"
            />
          </div>
          <div className="w-40">
            <Label className="text-muted-foreground text-xs">תפקיד</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="bg-neutral-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">מנהל</SelectItem>
                <SelectItem value="manager">מנהל חשבון</SelectItem>
                <SelectItem value="viewer">צופה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleInvite}
            disabled={inviting}
            className="bg-[#1877F2] hover:bg-[#1565C0] text-white"
          >
            <UserPlus className="h-4 w-4" />
            {inviting ? "שולח..." : "הזמן"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50">
              <TableHead className="text-muted-foreground">מייל</TableHead>
              <TableHead className="text-muted-foreground">שם</TableHead>
              <TableHead className="text-muted-foreground">תפקיד</TableHead>
              <TableHead className="text-muted-foreground">תאריך הצטרפות</TableHead>
              <TableHead className="w-20 text-[#64748b]">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[#64748b] py-8">
                  אין משתמשים
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell dir="ltr" className="text-end font-mono text-sm">
                  {user.email}
                </TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                  >
                    <SelectTrigger className="w-36 bg-neutral-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">מנהל</SelectItem>
                      <SelectItem value="manager">מנהל חשבון</SelectItem>
                      <SelectItem value="viewer">צופה</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {user.created_at ? formatDate(user.created_at) : "—"}
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === user.id}
                        aria-label="הסר משתמש"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>הסרת משתמש</DialogTitle>
                        <DialogDescription>
                          האם להסיר את {user.name || user.email}? פעולה זו לא ניתנת לביטול.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">ביטול</Button>
                        </DialogClose>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(user.id)}
                        >
                          הסר
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
