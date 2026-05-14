import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, ShieldAlert, UploadCloud, Play } from "lucide-react";
import Skeleton from "../components/Skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import WalletModal from "@/components/WalletModal";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://acewassce-backend.onrender.com";

const Instructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { examId?: string } | null;
  
  const [exam, setExam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isLaunching, setIsLaunching] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.examId) {
      navigate('/practice');
      return;
    }

    async function fetchExam() {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', state.examId)
        .single();
      
      if (data) {
        setExam(data);
      }
      setIsLoading(false);
    }
    fetchExam();
  }, [state?.examId]);

  const displaySubject = exam?.subject || "Subject Unavailable";
  const displayYear = exam?.year ? `${exam.year} WASSCE Paper` : "No Year Selected";

  const handleStartExam = () => {
    setShowPicker(true);
  };

  const launchExam = async (mode: string) => {
    if (isLaunching) return;
    setIsLaunching(mode);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // 1. Create the Attempt Record via backend (deducts 10 points)
      const response = await fetch(`${backendUrl}/api/v1/attempts/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          student_id: user.id,
          exam_id: exam.id
        })
      });

      if (response.status === 402) {
        toast.error("Insufficient points! You need 10 points to start an exam.");
        setShowPicker(false);
        setShowWalletModal(true);
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to start exam attempt");
      }

      const attempt = await response.json();

      // 2. Navigate with Attempt ID
      if (mode === 'mcq') {
        navigate("/exam/mcq", { state: { examId: exam.id, attemptId: attempt.id } });
      } else {
        navigate("/exam/theory", { state: { examId: exam.id, attemptId: attempt.id } });
      }
      setShowPicker(false);
    } catch (error: any) {
      console.error("Error starting exam:", error.message);
      toast.error(error.message || "Failed to start exam");
    } finally {
      setIsLaunching(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
          <Skeleton variant="rectangle" className="h-12 w-1/3 mb-10" />
          <section className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5">
            <div className="flex-1 space-y-3">
              <Skeleton variant="text" className="h-8 w-3/4" />
              <Skeleton variant="text" className="h-4 w-1/2" />
            </div>
            <div className="flex gap-4">
              <Skeleton variant="rectangle" className="h-16 w-20 rounded-2xl" />
              <Skeleton variant="rectangle" className="h-16 w-20 rounded-2xl" />
            </div>
          </section>
          <div className="space-y-6">
            <Skeleton variant="text" className="h-6 w-1/4" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton variant="circle" className="h-10 w-10 shrink-0" />
                <div className="flex-1 space-y-2 mt-1">
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton variant="rectangle" className="h-14 w-full rounded-2xl fixed bottom-8 left-0 right-0 max-w-3xl mx-auto px-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* ── BACKGROUND MESH ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[5%] -left-[10%] h-[500px] w-[500px] rounded-full bg-red-600/5 blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[10%] h-[400px] w-[400px] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 max-w-3xl items-center px-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Pre-Exam Check</span>
            <h1 className="font-display text-sm font-extrabold text-white">Instructions & Rules</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 container px-4 sm:px-6 max-w-3xl mx-auto mt-6 animate-fade-up">

        {/* EXAM META DATA */}
        <section className="glass-card flex flex-col sm:flex-row items-center gap-4 sm:gap-8 rounded-3xl p-6 shadow-soft border border-white/10 mb-8 bg-white/5">
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-display text-2xl font-extrabold text-white">{displaySubject}</h2>
            <p className="text-sm font-semibold text-muted-foreground mt-1">{displayYear}</p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl px-5 py-3 border border-white/5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Obj / MCQs</span>
              <span className="font-display text-lg font-extrabold text-blue-400">
                {((exam?.mcq_duration || 5400) / 3600).toFixed(1)} hrs
              </span>
            </div>
            <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl px-5 py-3 border border-white/5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Theory</span>
              <span className="font-display text-lg font-extrabold text-purple-400">
                {((exam?.theory_duration || 9000) / 3600).toFixed(1)} hrs
              </span>
            </div>
          </div>
        </section>

        {/* RULES LIST */}
        <div className="space-y-6">
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Strict WAEC Guidelines
          </h3>
          
          <ul className="space-y-4">
            <li className="flex gap-4 items-start">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 mt-0.5">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-white text-sm">Strict Timers per Section</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  The MCQ (Objective) section and Theory section have completely separate timers. Once the MCQ timer runs out, it auto-submits. You cannot go back.
                </p>
              </div>
            </li>

            <li className="flex gap-4 items-start">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-white text-sm">Lock-Out After Time Expires</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  When the final exam time is up, you cannot submit any typed answers or click any multiple choice options. The system locks instantly.
                </p>
              </div>
            </li>

            <li className="flex gap-4 items-start">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                <UploadCloud className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-white text-sm">Guided Camera Submissions</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  For Theory questions, you write offline. When the timer runs out, the app opens a <b>Guided Scanner Wizard</b>. You will snap and attach your workings sequentially one-by-one (e.g. capture Q1, then Q2).
                </p>
              </div>
            </li>
          </ul>
        </div>
      </main>

      {/* ── STICKY START FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-background/80 backdrop-blur-xl border-t border-white/10 pointer-events-auto">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-white">Are you in a quiet environment?</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Do not close the tab once the exam begins.</p>
          </div>
          <Button
            size="lg"
            onClick={handleStartExam}
            className="w-full sm:w-auto h-14 rounded-2xl bg-primary hover:bg-primary/90 font-extrabold text-white shadow-glow transition-transform active:scale-95"
          >
            I Understand, Start WASSCE
            <Play className="ml-2 h-5 w-5 fill-current" />
          </Button>
        </div>
      </div>

      {/* ── MODE PICKER MODAL ── */}
      {showPicker && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-xl animate-fade-in"
            onClick={() => setShowPicker(false)}
          />
          <div className="relative w-full max-w-sm bg-card/95 border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-glow animate-fade-up">
            <h3 className="font-display text-xl font-extrabold text-white mb-2 text-center">
              Select Exam Section
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-6">
              You can start with either section. Time runs independently.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => launchExam('mcq')}
                disabled={isLaunching !== null}
                className={`group relative flex items-center justify-between overflow-hidden rounded-2xl bg-blue-500/10 border border-blue-500/30 p-4 transition-all text-left ${isLaunching !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500/20'}`}
              >
                <div>
                  <p className="font-bold text-blue-400 text-sm">
                    {isLaunching === 'mcq' ? 'Starting Attempt...' : 'Multiple Choice (MCQs)'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">50 Questions • {(exam?.mcq_duration / 3600).toFixed(1)} hrs</p>
                </div>
                {isLaunching === 'mcq' ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                ) : (
                  <Play className="h-5 w-5 text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              
              <button 
                onClick={() => launchExam('theory')}
                disabled={isLaunching !== null}
                className={`group relative flex items-center justify-between overflow-hidden rounded-2xl bg-purple-500/10 border border-purple-500/30 p-4 transition-all text-left ${isLaunching !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-500/20'}`}
              >
                <div>
                  <p className="font-bold text-purple-400 text-sm">
                    {isLaunching === 'theory' ? 'Starting Attempt...' : 'Theory / Written'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Written workings • {(exam?.theory_duration / 3600).toFixed(1)} hrs</p>
                </div>
                {isLaunching === 'theory' ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                ) : (
                  <Play className="h-5 w-5 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
            
            <button 
              onClick={() => setShowPicker(false)}
              className="mt-6 w-full text-center text-sm font-semibold text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <WalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />
    </div>
  );
};

export default Instructions;
