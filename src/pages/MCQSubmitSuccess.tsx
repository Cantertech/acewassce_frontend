import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, ArrowRight, ShieldCheck, FileText, Loader2, Sparkles, BrainCircuit } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MCQSubmitSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { attemptId?: string; examId?: string; answeredCount?: number; totalCount?: number } | null;
  const attemptId = state?.attemptId;
  const examId = state?.examId;
  const answeredCount = state?.answeredCount || 0;
  const totalCount = state?.totalCount || 50;

  const [status, setStatus] = useState<'pending' | 'graded' | 'mcq_marked' | 'theory_marked'>('pending');
  const [theoryCompleted, setTheoryCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsSimulating(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }

    const checkStatus = async () => {
      const { data } = await supabase
        .from('exam_attempts')
        .select('status, theory_completed_at, mcq_completed_at')
        .eq('id', attemptId)
        .single();

      if (data) {
        setStatus(data.status);
        setTheoryCompleted(!!data.theory_completed_at);
        
        // Auto-redirect when fully graded
        if (data.status === 'graded') {
          navigate("/exam/results", { state: { attemptId } });
          return;
        }
      }
      setLoading(false);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [attemptId, navigate]);

  const handleProceedToTheory = () => {
    navigate("/exam/theory", { state: { attemptId, examId } });
  };

  const isGraded = status === 'graded';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 overflow-hidden relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[20%] left-[20%] h-[400px] w-[400px] rounded-full bg-emerald-600/8 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[20%] h-[300px] w-[300px] rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center animate-fade-up">
        {/* ── SCANNING STATE ── */}
        {isSimulating ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative h-24 w-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[3px] border-white/5 border-t-emerald-500 animate-spin" />
              <ShieldCheck className="h-10 w-10 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight mb-1">Verifying Answers</h2>
              <p className="text-xs text-muted-foreground font-medium">Securing your {answeredCount} responses...</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-1 w-1 rounded-full bg-emerald-500/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── SUCCESS STATE ── */}
            {/* Icon */}
            <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center relative">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
              <Sparkles className="absolute -top-1.5 -right-1.5 h-4 w-4 text-amber-400 animate-pulse" />
            </div>

            <h1 className="font-display text-2xl font-extrabold text-white tracking-tight mb-2">
              {theoryCompleted ? "Exam Complete!" : "MCQs Submitted!"}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed mb-8 max-w-xs mx-auto">
              {theoryCompleted
                ? "Both sections are recorded. Your final report is being generated."
                : "Objective answers secured. Complete the Theory section for your full result."}
            </p>

            {/* Score pill */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Answered</p>
                  <p className="text-base font-black text-white">{answeredCount} <span className="text-muted-foreground text-xs font-bold">/ {totalCount}</span></p>
                </div>
              </div>
            </div>

            {/* Progress breadcrumb */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">MCQ ✓</span>
              </div>
              <div className="h-px w-4 bg-white/10" />
              {theoryCompleted ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Theory ✓</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 animate-pulse">
                  <FileText className="h-3 w-3 text-purple-400" />
                  <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Theory Next</span>
                </div>
              )}
              <div className="h-px w-4 bg-white/10" />
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isGraded ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                <BrainCircuit className={`h-3 w-3 ${isGraded ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${isGraded ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {isGraded ? 'Done ✓' : 'Results'}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <button
                disabled={theoryCompleted && !isGraded}
                onClick={() => {
                  if (isGraded) {
                    navigate("/exam/results", { state: { attemptId } });
                  } else if (!theoryCompleted) {
                    handleProceedToTheory();
                  }
                }}
                className={`w-full h-14 rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 ${
                  isGraded
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                    : 'bg-white text-primary hover:bg-white/90'
                }`}
              >
                {isGraded
                  ? "View Results"
                  : theoryCompleted
                    ? "Finalizing..."
                    : "Start Theory Exam"}
                <ArrowRight className="h-5 w-5" />
              </button>

              {/* Status indicator */}
              {theoryCompleted && !isGraded && (
                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold bg-white/[0.03] rounded-2xl py-3 border border-white/5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  AI is generating your report...
                </div>
              )}

              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-2 text-[11px] font-bold text-muted-foreground hover:text-white transition-colors"
              >
                Save & Continue Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MCQSubmitSuccess;
