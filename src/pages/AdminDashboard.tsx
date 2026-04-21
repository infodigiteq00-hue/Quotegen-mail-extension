import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, ChevronDown, Crown, LogOut, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  createUserByAdmin,
  deleteUserByAdmin,
  getManagedUsers,
  getCurrentUser,
  getUserQuoteUsage,
  logout,
  updateUserByAdmin,
} from "@/utils/authStorage";

type Plan = "free" | "pro" | "enterprise";

const PLAN_OPTIONS: Plan[] = ["free", "pro", "enterprise"];
const DASHBOARD_SUMMARY_PLANS: Plan[] = ["free", "pro", "enterprise"];
const APP_LOGO_SRC = "/quotegen-logo.svg";

interface UserFormState {
  id?: string;
  name: string;
  email: string;
  password: string;
  subscriptionPlan: Plan;
  quoteGenerationLimit: string;
}

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  password: "",
  subscriptionPlan: "free",
  quoteGenerationLimit: "30",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const currentUserName = currentUser?.name || "Admin";
  const currentUserEmail = currentUser?.email || "info.digiteq00@gmail.com";
  const [users, setUsers] = useState(getManagedUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);

  const totalUsers = users.length;
  const plansSummary = useMemo(
    () =>
      DASHBOARD_SUMMARY_PLANS.map(plan => ({
        plan,
        total: users.filter(user => user.subscriptionPlan === plan).length,
      })),
    [users],
  );
  const totalUsedQuotes = useMemo(
    () => users.reduce((acc, user) => acc + getUserQuoteUsage(user.id), 0),
    [users],
  );

  const refreshUsers = () => {
    setUsers(getManagedUsers());
  };

  const openAddDialog = () => {
    setMode("add");
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (userId: string) => {
    const user = users.find(item => item.id === userId);
    if (!user) return;
    setMode("edit");
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      subscriptionPlan: user.subscriptionPlan,
      quoteGenerationLimit: String(user.quoteGenerationLimit),
    });
    setIsDialogOpen(true);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const limit = Number.parseInt(form.quoteGenerationLimit, 10);
    if (!Number.isFinite(limit) || limit < 0) {
      toast({
        title: "Invalid limit",
        description: "Quote generation limit must be a non-negative number.",
        variant: "destructive",
      });
      return;
    }

    if (mode === "add") {
      if (!form.password.trim()) {
        toast({
          title: "Password required",
          description: "Please provide a password for the new user.",
          variant: "destructive",
        });
        return;
      }

      const result = createUserByAdmin({
        name: form.name,
        email: form.email,
        password: form.password,
        subscriptionPlan: form.subscriptionPlan,
        quoteGenerationLimit: limit,
      });

      if (!result.ok) {
        toast({ title: "Unable to create user", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: "User created", description: "New user is now available in the dashboard." });
    } else {
      if (!form.id) return;
      const result = updateUserByAdmin(form.id, {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        subscriptionPlan: form.subscriptionPlan,
        quoteGenerationLimit: limit,
      });

      if (!result.ok) {
        toast({ title: "Unable to update user", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: "User updated", description: "User details were updated successfully." });
    }

    refreshUsers();
    setIsDialogOpen(false);
  };

  const handleDelete = (userId: string) => {
    const target = users.find(user => user.id === userId);
    if (!target) return;

    if (!window.confirm(`Delete ${target.name} (${target.email})? This action cannot be undone.`)) return;

    const result = deleteUserByAdmin(userId);
    if (!result.ok) {
      toast({ title: "Unable to delete user", description: result.error, variant: "destructive" });
      return;
    }

    refreshUsers();
    toast({ title: "User deleted", description: "The user account has been removed." });
  };

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-primary/15 bg-gradient-to-r from-primary/10 via-card to-card px-3 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:px-4">
        <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg border border-primary/25 bg-primary/10 p-1.5">
              <img src={APP_LOGO_SRC} alt="QuoteGen logo" className="h-6 w-6 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">QuoteGen Admin Dashboard</h1>
              <p className="line-clamp-2 text-xs text-muted-foreground sm:line-clamp-1">
                User control panel with plans, limits, and activity
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-2 py-1 pr-3 text-sm font-medium text-primary transition-colors hover:bg-primary/[0.14]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {currentUserName.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">{currentUserName}</span>
                <ChevronDown className="h-4 w-4 opacity-80 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 border-primary/20">
              <DropdownMenuLabel className="pb-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{currentUserName}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{currentUserEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-primary focus:text-primary">
                <ShieldCheck className="h-4 w-4" />
                Admin Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-4 p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.14] via-primary/[0.07] to-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/20">
            <CardHeader className="pb-2">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <p className="text-3xl font-bold leading-none text-primary">{totalUsers}</p>
              </div>
              <CardTitle className="text-base">Total Users</CardTitle>
              <CardDescription>Registered QuoteGen accounts</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
          {plansSummary.map(item => (
            <Card key={item.plan} className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.1] via-primary/[0.04] to-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/20">
              <CardHeader className="pb-2">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                    {item.plan === "enterprise" ? (
                      <Crown className="h-4 w-4" />
                    ) : item.plan === "pro" ? (
                      <BarChart3 className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                  </div>
                  <p className="text-3xl font-bold leading-none text-primary">{item.total}</p>
                </div>
                <CardTitle className="text-base capitalize">{item.plan}</CardTitle>
                <CardDescription>Plan subscriptions</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>

        <Card className="border-primary/20 shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-primary/10">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">User Management</CardTitle>
              <CardDescription>Add, edit, delete users and control quote generation limits</CardDescription>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Badge variant="secondary" className="w-fit border border-primary/20 bg-primary/10 text-primary">
                Total Used: {totalUsedQuotes}
              </Badge>
              <Button onClick={openAddDialog} className="shadow-sm sm:w-auto">
              <Plus className="h-4 w-4" />
              Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="hidden overflow-x-auto rounded-xl border border-primary/20 md:block">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-primary/[0.08]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground/80">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground/80">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground/80">Subscription</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground/80">Quote Limit</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground/80">Used</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground/80">Created</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground/80">Last Login</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground/80">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="border-t border-border/70 transition-colors duration-150 hover:bg-primary/[0.08]">
                        <td className="px-3 py-2 font-medium text-foreground">{user.name}</td>
                        <td className="px-3 py-2 text-foreground">{user.email}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className="capitalize border border-primary/20 bg-primary/10 text-primary">
                            {user.subscriptionPlan}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-foreground">{user.quoteGenerationLimit}</td>
                        <td className="px-3 py-2 text-foreground">{getUserQuoteUsage(user.id)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{new Date(user.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(user.id)}
                              aria-label="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDelete(user.id)}
                              aria-label="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {users.length === 0 ? (
                <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 text-sm text-muted-foreground">No users found.</div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="space-y-3 rounded-lg border border-primary/20 bg-primary/[0.03] p-3 transition-all duration-150 hover:border-primary/40 hover:bg-primary/[0.08] hover:shadow-sm hover:shadow-primary/15">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize border border-primary/20 bg-primary/10 text-primary">
                        {user.subscriptionPlan}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <p className="text-muted-foreground">Limit: {user.quoteGenerationLimit}</p>
                      <p className="text-muted-foreground">Used: {getUserQuoteUsage(user.id)}</p>
                      <p className="text-muted-foreground">Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                      <p className="text-muted-foreground">
                        Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(user.id)}
                        aria-label="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDelete(user.id)}
                        aria-label="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? "Add User" : "Edit User"}</DialogTitle>
            <DialogDescription>
              {mode === "add"
                ? "Create a new QuoteGen account with subscription and quote limit."
                : "Update user details, subscription plan, and quote generation limit."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-1.5">
              <Label htmlFor="admin-user-name">Full Name</Label>
              <Input
                id="admin-user-name"
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-user-email">Email</Label>
              <Input
                id="admin-user-email"
                type="email"
                value={form.email}
                onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-user-password">
                Password {mode === "edit" ? "(Leave blank to keep current)" : ""}
              </Label>
              <Input
                id="admin-user-password"
                type="password"
                value={form.password}
                onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
                required={mode === "add"}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Subscription Plan</Label>
                <Select
                  value={form.subscriptionPlan}
                  onValueChange={value => setForm(prev => ({ ...prev, subscriptionPlan: value as Plan }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(option => (
                      <SelectItem key={option} value={option} className="capitalize">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-user-limit">Quote Generation Limit</Label>
                <Input
                  id="admin-user-limit"
                  type="number"
                  min={0}
                  value={form.quoteGenerationLimit}
                  onChange={event => setForm(prev => ({ ...prev, quoteGenerationLimit: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">{mode === "add" ? "Create User" : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
