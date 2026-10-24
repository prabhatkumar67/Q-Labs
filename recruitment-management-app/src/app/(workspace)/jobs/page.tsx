"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Building2, MapPin, Trash2, Plus } from "lucide-react";

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  openings: number;
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    status: "Open",
    openings: 1,
  });

  async function load() {
    const data = await fetch("/api/jobs").then((res) => res.json());
    setJobs(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function createJob(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, openings: Number(form.openings) }),
    });
    setForm({ title: "", department: "", location: "", status: "Open", openings: 1 });
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeJob(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6" data-testid="admin-jobs-page">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-muted-foreground" />
          Manage Requisitions
        </h2>
        <p className="text-sm text-muted-foreground">
          Create and manage open job positions across the company.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* New Job Form */}
        <Card className="p-5 md:sticky top-20">
          <form onSubmit={createJob} className="space-y-4" data-testid="admin-jobs-create-form">
            <h3 className="font-medium text-[14px]">Create New Role</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-medium mb-1.5 block">Job Title</label>
                <Input value={form.title} placeholder="e.g. Senior Engineer" onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required data-testid="job-form-title" />
              </div>
              
              <div>
                <label className="text-[12px] font-medium mb-1.5 block">Department</label>
                <Input value={form.department} placeholder="e.g. Engineering" onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} required data-testid="job-form-department" />
              </div>
              
              <div>
                <label className="text-[12px] font-medium mb-1.5 block">Location</label>
                <Input value={form.location} placeholder="e.g. Remote, NY" onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} required data-testid="job-form-location" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block">Status</label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} data-testid="job-form-status"
                  >
                    <option>Open</option>
                    <option>Paused</option>
                    <option>Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block">Headcount</label>
                  <Input type="number" min={1} value={form.openings} onChange={(e) => setForm((p) => ({ ...p, openings: Number(e.target.value) }))} required data-testid="job-form-openings" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" data-testid="job-form-submit">
              <Plus className="w-4 h-4 mr-2" /> Create Job
            </Button>
          </form>
        </Card>

        {/* Existing Jobs List */}
        <div className="md:col-span-2 space-y-4" data-testid="admin-jobs-table-panel">
          {jobs.length === 0 ? (
             <Card className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground border-dashed">
             <Briefcase className="w-8 h-8 opacity-20 mb-3" />
             <p className="text-sm">No requisitions created yet.</p>
           </Card>
          ) : (
            jobs.map((job) => (
              <Card key={job.id} className="p-0 overflow-hidden group transition-all duration-200 hover:shadow-md border-border/60">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-[15px] group-hover:text-blue-600 transition-colors">{job.title}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {job.department}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-secondary text-[11px] font-medium">Headcount: {job.openings}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="flex items-center bg-muted/30 rounded-md border border-border/50 px-2 py-1">
                      <span className={`w-2 h-2 rounded-full mr-2 ${job.status === 'Open' ? 'bg-green-500' : job.status === 'Paused' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <select 
                        value={job.status} 
                        onChange={(e) => updateStatus(job.id, e.target.value)} 
                        className="bg-transparent text-[13px] font-medium outline-none cursor-pointer"
                        data-testid={`job-status-select-${job.id}`}
                      >
                        <option>Open</option>
                        <option>Paused</option>
                        <option>Closed</option>
                      </select>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50 -ml-1 h-8 w-8"
                      onClick={() => removeJob(job.id)}
                      data-testid={`job-delete-${job.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
