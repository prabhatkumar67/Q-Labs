"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Navigation, Send } from "lucide-react";
import Link from "next/link";

type Job = {
  id: string;
  title: string;
};

export default function ApplyPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    jobId: "",
    score: 70,
  });

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: Job[]) => {
        setJobs(data);
        if (data.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const defaultJobId = params.get("jobId") || data[0].id;
          setForm((p) => ({ ...p, jobId: defaultJobId }));
        }
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4" data-testid="candidate-apply-page">
      <Card className="w-full max-w-md p-8 shadow-sm border-border/60" data-testid="candidate-apply-card">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5">Candidate Portal</p>
          <h2 className="text-2xl font-semibold tracking-tight">Application</h2>
        </div>

        {submitted ? (
          <div className="text-center space-y-6">
            <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-green-700">Application Submitted!</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for applying. Our talent team will review your profile and reach out if there&apos;s a match.
              </p>
            </div>
            
            <Link href="/careers" className="mt-8 w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              <Navigation className="w-4 h-4 mr-2" /> Back to Careers
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit} data-testid="candidate-apply-form">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Full Name</label>
                <Input
                  required
                  placeholder="e.g. Jane Doe"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  data-testid="apply-field-name"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Email Address</label>
                <Input
                  required
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  data-testid="apply-field-email"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Position</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.jobId}
                  onChange={(e) => setForm((p) => ({ ...p, jobId: e.target.value }))}
                  data-testid="apply-field-job"
                  required
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hidden simulated initial 'score' parameter for demo purposes */}
              <input
                type="hidden"
                value={form.score}
                onChange={(e) => setForm((p) => ({ ...p, score: Number(e.target.value) }))}
              />
            </div>

            <Button type="submit" className="w-full mt-2" data-testid="apply-submit">
               Submit Application <Send className="w-4 h-4 ml-2" />
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
