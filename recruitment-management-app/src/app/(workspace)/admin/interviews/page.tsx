"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, Trash2, User, ArrowUpDown, Plus } from "lucide-react";

const DEFAULT_SCHEDULED_AT = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 16);

type Interview = {
  id: string;
  type: string;
  scheduledAt: string;
  interviewer: string;
  status: string;
};

type Candidate = {
  id: string;
  name: string;
  jobId: string;
};

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    candidateId: "",
    jobId: "",
    type: "Phone",
    scheduledAt: DEFAULT_SCHEDULED_AT,
    interviewer: "",
    status: "Scheduled",
  });

  const load = useCallback(async () => {
    try {
      const [interviewData, candidateData] = await Promise.all([
        fetch("/api/interviews").then((res) => res.json()),
        fetch("/api/candidates").then((res) => res.json()),
      ]);

      setInterviews(interviewData);
      setCandidates(candidateData);

      setForm((prev) => {
        if (prev.candidateId || candidateData.length === 0) {
          return prev;
        }
        return { ...prev, candidateId: candidateData[0].id, jobId: candidateData[0].jobId };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function schedule(event: FormEvent) {
    event.preventDefault();
    setIsScheduling(true);
    try {
      await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scheduledAt: new Date(form.scheduledAt).toISOString() }),
      });
      setForm((prev) => ({ ...prev, interviewer: "" }));
      await load();
    } finally {
      setIsScheduling(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/interviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeInterview(id: string) {
    await fetch(`/api/interviews/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-8 animate-in fade-in" data-testid="admin-interviews-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Interview Directory</h2>
          <p className="text-sm text-muted-foreground mt-1">Schedule and monitor candidate evaluations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 border border-border rounded-xl p-6 bg-white shadow-sm self-start sticky top-24 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-foreground">Schedule Session</h3>
          </div>
          <form onSubmit={schedule} className="space-y-4" data-testid="admin-interviews-form">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Candidate</label>
              <div className="relative">
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-black appearance-none"
                  value={form.candidateId}
                  onChange={(event) => {
                    const selected = candidates.find((candidate) => candidate.id === event.target.value);
                    setForm((prev) => ({ ...prev, candidateId: event.target.value, jobId: selected?.jobId ?? "" }));
                  }}
                  data-testid="interview-form-candidate"
                  required
                >
                  <option value="" disabled>Select a candidate</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                  ))}
                </select>
                <ArrowUpDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 opacity-50 text-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Format</label>
              <div className="relative">
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-black appearance-none"
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                  data-testid="interview-form-type"
                >
                  <option>Phone</option>
                  <option>Technical</option>
                  <option>Panel</option>
                  <option>Final</option>
                </select>
                <ArrowUpDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 opacity-50 text-foreground" />
              </div>
            </div>

            <Input
              label="Date & Time"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
              required
              data-testid="interview-form-scheduled-at"
            />
            
            <Input
              label="Interviewer"
              placeholder="e.g. John Smith"
              value={form.interviewer}
              onChange={(event) => setForm((prev) => ({ ...prev, interviewer: event.target.value }))}
              required
              data-testid="interview-form-interviewer"
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Status</label>
              <div className="relative">
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-black appearance-none"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  data-testid="interview-form-status"
                >
                  <option>Scheduled</option>
                  <option>Completed</option>
                  <option>Canceled</option>
                </select>
                <ArrowUpDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 opacity-50 text-foreground" />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isScheduling || candidates.length === 0} data-testid="interview-form-submit">
              {isScheduling ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-3">
          <Card className="overflow-hidden border border-border bg-white" data-testid="admin-interviews-table-panel">
            <div className="min-w-full overflow-x-auto">
              <table className="min-w-full text-left text-sm" data-testid="admin-interviews-table">
                <thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-medium">When</th>
                    <th scope="col" className="px-6 py-4 font-medium">Format</th>
                    <th scope="col" className="px-6 py-4 font-medium">Interviewer</th>
                    <th scope="col" className="px-6 py-4 font-medium">Status</th>
                    <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground bg-white">
                  {interviews.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground flex-col flex items-center h-[200px] justify-center">
                        <CalendarIcon className="w-8 h-8 opacity-20 mb-3" />
                        No interviews scheduled.
                      </td>
                    </tr>
                  ) : (
                    interviews.map((interview) => (
                      <tr key={interview.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{new Date(interview.scheduledAt).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="inline-flex items-center justify-center bg-black/5 text-black border border-black/10 rounded px-2 py-0.5 text-xs font-medium">
                            {interview.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4 opacity-50" />
                            {interview.interviewer}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="relative inline-block w-32">
                            <select
                              className="flex h-8 w-full rounded-md border border-border bg-white px-2 py-1 text-xs focus-visible:outline-none focus:ring-1 focus:ring-black appearance-none cursor-pointer"
                              value={interview.status}
                              onChange={(event) => updateStatus(interview.id, event.target.value)}
                              data-testid={`interview-status-select-${interview.id}`}
                            >
                              <option>Scheduled</option>
                              <option>Completed</option>
                              <option>Canceled</option>
                            </select>
                            <ArrowUpDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 opacity-50 text-foreground" />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent group-hover:border-red-100"
                            onClick={() => removeInterview(interview.id)}
                            data-testid={`interview-delete-${interview.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
