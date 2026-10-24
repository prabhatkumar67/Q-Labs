"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-modal";
import {
  Box,
  Trash2,
  Plus,
  X,
  Search,
} from "lucide-react";
import Link from "next/link";

interface App {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const { confirm } = useConfirm();

  useEffect(() => {
    loadApps();
  }, []);

  async function loadApps() {
    setLoading(true);
    try {
      const data: App[] = await api("/api/apps");
      setApps(data);
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (app) => {
          try {
            const versions = await api(`/api/apps/${app.id}/versions`);
            counts[app.id] = versions.length;
          } catch {
            counts[app.id] = 0;
          }
        })
      );
      setVersionCounts(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createApp(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/apps", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      setName("");
      setDescription("");
      setShowForm(false);
      loadApps();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create app");
    }
  }

  async function deleteApp(id: string) {
    const ok = await confirm({
      title: "Delete App",
      description:
        "This app and all its versions will be permanently removed. Any sandboxes launched from it will not be affected.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/apps/${id}`, { method: "DELETE" });
    setApps(apps.filter((a) => a.id !== id));
  }

  const filtered = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-12 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-semibold">Apps</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your applications and Docker images
          </p>
        </div>
        <Button
          variant={showForm ? "outline" : "onyx"}
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? (
            <>
              <X className="size-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="size-4" />
              New App
            </>
          )}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border p-6 animate-fade-in-scale">
          <h3 className="font-semibold mb-4">Create App</h3>
          <form onSubmit={createApp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. My E-Commerce Store"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="onyx">Create App</Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {apps.length} apps
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border overflow-hidden animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Box className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {apps.length === 0 ? "No apps yet" : "No matches found"}
            </p>
            {apps.length === 0 && (
              <p className="text-xs text-muted-foreground/60">
                Create one to get started
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Versions</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Created</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/apps/${app.id}`}
                      className="font-medium hover:text-onyx-green transition-colors"
                    >
                      {app.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                    {app.description || "---"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="text-[10px]">
                      {versionCounts[app.id] ?? 0}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => deleteApp(app.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
