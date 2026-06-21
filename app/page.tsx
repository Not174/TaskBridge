import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jose';
import { ArrowRight, ClipboardPlus, Handshake, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tb_access_token')?.value;
  let user = null;

  if (token) {
    const payload = await verifyJWT(token);
    if (payload) {
      user = payload;
    }
  }

  // Determine CTA destinations dynamically
  const posterCTA = user 
    ? (user.role === 'POSTER' ? '/poster/post-task' : '/poster/dashboard') 
    : '/signup?role=POSTER';
    
  const seekerCTA = user 
    ? (user.role === 'SEEKER' ? '/seeker/jobs' : '/seeker/jobs') 
    : '/signup?role=SEEKER';

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <section className="bg-primary text-white py-20 lg:py-32 relative overflow-hidden">
        {/* Decorative Grid Patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Bangladeshi Flag Accent Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold tracking-wider uppercase text-accent border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Connecting Bangladesh
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Get Things Done. <br />
              <span className="text-accent">Find Work Instantly.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
              TaskBridge connects Bangladeshi clients who need tasks completed with skilled local professionals ready to work. Secured payments, live GPS tracking, and vetted seekers.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={posterCTA}
                className="w-full sm:w-auto px-8 py-4 bg-accent text-primary font-bold rounded-xl shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                Post a Task
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href={seekerCTA}
                className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Find Work
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How It Works Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              How TaskBridge Works
            </h2>
            <p className="text-slate-500">
              Get your jobs completed in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                <ClipboardPlus size={24} />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">1. Post a Task</h3>
              <p className="text-slate-500 leading-relaxed">
                Describe the work you need done, select a category, set your BDT budget, and specify a deadline.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                <Handshake size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">2. Match with Seeker</h3>
              <p className="text-slate-500 leading-relaxed">
                Interested workers browse the job board and accept. You'll receive instant updates when a seeker is assigned.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">3. Job Done</h3>
              <p className="text-slate-500 leading-relaxed">
                Monitor work progress using live GPS tracking. Once completed, mark the task done and complete the payout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Value Proposition / Security Features */}
      <section className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                Secure, Transparent gig-work Platform
              </h2>
              <p className="text-slate-500 leading-relaxed">
                TaskBridge incorporates modern security safeguards tailored for the Bangladeshi context. From phone number verification to telemetry verification, we ensure reliability for both posters and seekers.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center mt-0.5">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">OTP Phone Verification</h4>
                    <p className="text-sm text-slate-500">Every user validates their Bangladeshi mobile number via SMS verification on signup.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Live Seeker Telemetry</h4>
                    <p className="text-sm text-slate-500">Poster clients can track seeker location on a Leaflet map in real time while tasks are in progress.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-8 rounded-3xl border border-slate-200/50 flex flex-col gap-6 items-center justify-center text-center">
              <div className="space-y-2">
                <div className="text-5xl font-black text-primary">0%</div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Broker Commission Fees</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Pay workers their full requested budget. No hidden fees or cuts from TaskBridge during our introductory launch.</p>
              </div>
              <div className="w-full border-t border-slate-200"></div>
              <div className="space-y-2">
                <div className="text-5xl font-black text-accent">24/7</div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Admin Monitoring</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Platform administrators enforce terms of service, ban malicious actors, and resolve task disputes instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
