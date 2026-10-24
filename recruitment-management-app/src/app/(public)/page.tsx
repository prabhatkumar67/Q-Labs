import Link from "next/link";
import { ArrowRight, BriefcaseIcon, Users } from "lucide-react";

export default function RoleGatewayPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 sm:p-12 font-sans relative overflow-hidden" data-testid="role-gateway-page">
      
      {/* Subtle modern background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-black opacity-[0.03] blur-[100px]"></div>

      <div className="w-full max-w-4xl z-10 space-y-16">
        
        {/* Header Section */}
        <header className="text-center space-y-6">
          <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
            v2.0 Operations Framework
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-2">
            Hiring operations, <br />
            <span className="text-muted-foreground">simplified.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light mt-4">
            RecruitOps cleanly separates the candidate experience from recruiter workflows, providing secure boundaries and unparalleled clarity.
          </p>
        </header>

        {/* Portals Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          
          {/* Candidate Card */}
          <Link 
            href="/user-login" 
            className="group relative flex flex-col justify-between p-8 sm:p-10 rounded-[20px] bg-white border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            data-testid="candidate-continue-button"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <BriefcaseIcon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-foreground mt-4">Candidate Portal</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed opacity-90">
                  Browse open positions, track application statuses, and manage your profile in a frictionless environment.
                </p>
              </div>
            </div>
            
            <div className="mt-12 flex items-center text-sm font-medium text-foreground opacity-70 group-hover:opacity-100 transition-opacity">
              Access portal <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Recruiter Card */}
          <Link 
            href="/login" 
            className="group relative flex flex-col justify-between p-8 sm:p-10 rounded-[20px] bg-[#0a0a0a] text-white border border-black shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            data-testid="recruiter-continue-button"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-white mt-4">Admin Workspace</h3>
                <p className="text-sm text-white/60 mt-2 leading-relaxed">
                  The command center for recruiters. Manage pipelines, schedule interviews, and review candidate talent.
                </p>
              </div>
            </div>

            <div className="mt-12 flex items-center text-sm font-medium text-white opacity-80 group-hover:opacity-100 transition-opacity">
              Enter workspace <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </section>
        
        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground font-medium pt-8">
          Built with precision for top-tier teams.
        </footer>
      </div>
    </div>
  );
}
