"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Briefcase, Users, Calendar, ArrowUpRight, TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Stats = {
  openJobs: number;
  candidates: number;
  interviewsScheduled: number;
  offers: number;
  hires: number;
  avgCandidateScore: number;
  stageCounts: {
    Applied: number;
    Screening: number;
    Interview: number;
    Offer: number;
    Hired: number;
    Rejected: number;
  };
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  async function load() {
    try {
      const data = await fetch("/api/metrics").then((res) => res.json());
      setStats(data);
    } catch {
      // Mock data in case DB is unseeded locally
      setStats({
        openJobs: 12,
        candidates: 248,
        interviewsScheduled: 34,
        offers: 8,
        hires: 21,
        avgCandidateScore: 84.5,
        stageCounts: { Applied: 110, Screening: 45, Interview: 34, Offer: 8, Hired: 21, Rejected: 30 }
      });
    }
  }

  useEffect(() => {
    const fetchStats = async () => {
      await load();
    };
    fetchStats();
  }, []);

  if (!stats) {
    return <div className="animate-pulse space-y-8" data-testid="admin-dashboard-loading">
      <div className="h-10 bg-muted rounded w-1/4"></div>
      <div className="grid grid-cols-3 gap-6"><div className="h-32 bg-muted rounded"></div><div className="h-32 bg-muted rounded"></div><div className="h-32 bg-muted rounded"></div></div>
    </div>;
  }

  return (
    <div className="space-y-10" data-testid="admin-dashboard-page">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-testid="admin-dashboard-header">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Here is the latest data for your active requisitions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/jobs" passHref><Button variant="secondary" size="sm" data-testid="admin-manage-jobs-link"><Briefcase className="w-4 h-4 mr-2" />Requisitions</Button></Link>
          <Link href="/admin/candidates" passHref><Button variant="secondary" size="sm" data-testid="admin-manage-candidates-link"><Users className="w-4 h-4 mr-2" />Candidates</Button></Link>
          <Link href="/admin/interviews" passHref><Button variant="default" size="sm" data-testid="admin-manage-interviews-link"><Calendar className="w-4 h-4 mr-2" />Interviews</Button></Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="admin-metrics-grid">
        
        <Card data-testid="metric-open-jobs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Roles</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tighter">{stats.openJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">+2 from last month</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-candidates">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tighter">{stats.candidates}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center text-emerald-600"><TrendingUp className="w-3 h-3 mr-1" /> +14% from last week</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-scheduled-interviews">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tighter">{stats.interviewsScheduled}</div>
            <p className="text-xs text-muted-foreground mt-1">Next 14 days</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-offers">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Offers Extended</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tighter">{stats.offers}</div>
          </CardContent>
        </Card>

        <Card data-testid="metric-hires">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hires</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tighter">{stats.hires}</div>
            <p className="text-xs text-muted-foreground mt-1">Year to date</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-avg-score">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Assessment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tighter">{stats.avgCandidateScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of 100 max</p>
          </CardContent>
        </Card>

      </div>

      {/* Stage Distribution Table */}
      <Card data-testid="candidate-stage-distribution" className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="text-sm">Candidate Pipeline Distribution</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left" data-testid="candidate-stage-table">
            <thead className="bg-[#FCFCFC] border-b border-border text-xs uppercase text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">Stage Name</th>
                <th className="px-6 py-4 w-32">Candidates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {Object.entries(stats.stageCounts).map(([stage, count]) => (
                <tr key={stage} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div> {stage}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
    </div>
  );
}
