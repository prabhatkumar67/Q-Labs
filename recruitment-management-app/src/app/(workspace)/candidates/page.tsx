"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users2, Mail, Star, Trash2 } from "lucide-react";

type Candidate = {
  id: string;
  name: string;
  email: string;
  stage: string;
  score: number;
};

export default function AdminCandidatesPage() {
  const [items, setItems] = useState<Candidate[]>([]);

  async function load() {
    const data = await fetch("/api/candidates").then((res) => res.json());
    setItems(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function updateStage(id: string, stage: string) {
    await fetch(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    load();
  }

  async function removeCandidate(id: string) {
    await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6" data-testid="admin-candidates-page">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users2 className="w-5 h-5 text-muted-foreground" />
          Manage Candidates
        </h2>
        <p className="text-sm text-muted-foreground">
          Track applicants and move them through the interview pipeline.
        </p>
      </div>

      <div className="space-y-4" data-testid="admin-candidates-table-panel">
        {items.length === 0 ? (
          <Card className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground border-dashed">
            <Users2 className="w-8 h-8 opacity-20 mb-3" />
            <p className="text-sm">No candidates in the pipeline.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((candidate) => (
              <Card key={candidate.id} className="p-5 group hover:border-black/20 transition-all duration-200 shadow-sm border-border/60">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-[15px]">{candidate.name}</h3>
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-1">
                      <Mail className="w-3.5 h-3.5" />
                      {candidate.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-[12px] font-medium border border-amber-200/50">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {candidate.score}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 mt-4 flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Pipeline Stage</label>
                    <select 
                      value={candidate.stage} 
                      onChange={(e) => updateStage(candidate.id, e.target.value)}
                      className="w-full text-[13px] bg-muted/30 border border-border/50 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-black/20"
                      data-testid={`candidate-stage-select-${candidate.id}`}
                    >
                      <option>Applied</option>
                      <option>Screening</option>
                      <option>Interview</option>
                      <option>Offer</option>
                      <option>Hired</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeCandidate(candidate.id)} 
                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50 mt-5 h-8 w-8"
                    data-testid={`candidate-remove-${candidate.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
