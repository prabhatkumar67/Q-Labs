"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Building2, MapPin, Eye, ExternalLink } from "lucide-react";

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: "Open" | "Paused" | "Closed";
  openings: number;
};

type Props = {
  previewMode?: boolean;
};

export function CareersBoard({ previewMode = false }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: Job[]) => setJobs(data.filter((job) => job.status === "Open")));
  }, []);

  return (
    <div className="space-y-8" data-testid={previewMode ? "candidate-preview-board" : "careers-board"}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-6" data-testid="careers-board-header">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Open Opportunities</h2>
            {previewMode && (
              <Badge variant="secondary" className="bg-amber-100/50 text-amber-800 hover:bg-amber-100/50 border-amber-200/50 rounded-sm font-medium px-2 py-0" data-testid="preview-mode-badge">
                <Eye className="w-3 h-3 mr-1" /> Preview Mode
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-[14px]">
            {previewMode 
              ? "Admin preview of how the job board appears to candidates." 
              : "Join our team and help build the future of our platform."}
          </p>
        </div>
        
        {!previewMode && (
          <Link href="/careers/apply" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2" data-testid="careers-apply-now-button">
              Quick Apply <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="careers-job-grid">
        {jobs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center justify-center border border-dashed rounded-lg">
             <Briefcase className="w-8 h-8 opacity-20 mb-3" />
             <p>No open positions right now. Check back later!</p>
          </div>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className="p-0 overflow-hidden flex flex-col hover:border-black/20 transition-all duration-200 shadow-sm border-border/60" data-testid={`job-card-${job.id}`}>
              <div className="p-6 flex-1">
                <div className="mb-4">
                  <h3 className="text-[17px] font-semibold tracking-tight leading-snug">{job.title}</h3>
                  <div className="flex items-center gap-1.5 mt-2 text-[13px] text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    {job.department}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[13px] text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex items-center justify-between mt-auto">
                <span className="text-[12px] font-medium text-muted-foreground">
                  {job.openings} opening{job.openings !== 1 ? 's' : ''}
                </span>
                
                {previewMode ? (
                  <Button variant="secondary" size="sm" disabled className="opacity-50 text-[12px] h-8" data-testid={`job-preview-cta-${job.id}`}>
                    Apply (Disabled)
                  </Button>
                ) : (
                  <Link href={`/careers/apply?jobId=${job.id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3 text-[12px]" data-testid={`job-apply-button-${job.id}`}>
                      Apply for this role
                  </Link>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
