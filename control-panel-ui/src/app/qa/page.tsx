"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";

interface QaRun {
  id: string;
  app_name: string;
  version_tag: string;
  status: "running" | "passed" | "failed" | "errored" | "blocked" | "cancelled";
  total_tests: number;
  passed_tests: number;
  created_at: string;
}

export default function QaDashboardPage() {
  const [runs, setRuns] = useState<QaRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/qa-runs")
      .then(data => setRuns(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="size-6 text-muted-foreground" />
            Auto-QA Runs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            HTTP smoke-check results. Browser behavior is not verified by these checks.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border overflow-hidden animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">App Release</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Pass Rate</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Executed</th>
              <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Report</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                <td className="py-3 px-4">
                  {run.status === "passed" ? (
                    <Badge variant="secondary" className="gap-1 bg-onyx-green/10 text-onyx-green hover:bg-onyx-green/20 border-transparent">
                      <CheckCircle2 className="size-3" /> Passed
                    </Badge>
                  ) : run.status === "failed" ? (
                    <Badge variant="destructive" className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent">
                      <XCircle className="size-3" /> Failed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 rounded-none border-border">
                      <Clock className="size-3" /> {run.status === "running" ? "Running" : run.status}
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-foreground">{run.app_name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{run.version_tag}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-muted overflow-hidden">
                      <div 
                        className={`h-full ${run.status === "passed" ? "bg-onyx-green" : "bg-destructive"}`}
                        style={{ width: `${(run.total_tests > 0 ? run.passed_tests / run.total_tests : 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {run.passed_tests}/{run.total_tests}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link href={`/qa/${run.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                      View Report <ArrowRight className="size-3 ml-1" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
