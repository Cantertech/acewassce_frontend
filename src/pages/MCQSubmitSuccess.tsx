import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, ArrowRight, ShieldCheck, FileText, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [mcqCompleted, setMcqCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsSimulating(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }

    const checkStatus = async () => {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('status, theory_completed_at, mcq_completed_at')
        .eq('id', attemptId)
        .single();

      if (data) {
        setStatus(data.status);
        setTheoryCompleted(!!data.theory_completed_at);
        setMcqCompleted(!!data.mcq_completed_at);

        if (data.status === 'graded') {
          // Both parts are done and marked
        }
      }
      setLoading(false);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [attemptId, navigate]);

  const handleProceedToTheory = () => {
    navigate("/exam/theory", { state: { attemptId, examId } });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0F1A] px-4 py-20 overflow-hidden font-inter">
      {/* ── BACKGROUND MESH ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[20%] left-[20%] h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[20%] h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center animate-fade-up">
        {isSimulating ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-fade-in">
            <div className="relative h-32 w-32 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-emerald-500 animate-spin" />
              <ShieldCheck className="h-12 w-12 text-emerald-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Verifying Answers</h2>
              <p className="text-muted-foreground font-medium">Securing your objective responses on the blockchain...</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-500/50 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* SUCCESS ICON & TEXT */}
            <div className="mb-12 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 shadow-glow relative group">
                <CheckCircle className="h-12 w-12 text-emerald-400 group-hover:scale-110 transition-transform" />
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-amber-400 animate-pulse" />
              </div>

              <h1 className="font-display text-4xl font-black text-white tracking-tight mb-3">
                {theoryCompleted ? "Mock Exam Complete!" : "Objectives Submitted!"}
              </h1>
              <p className="text-muted-foreground text-sm max-w-[280px] mx-auto leading-relaxed font-medium">
                {theoryCompleted
                  ? "Great job! Both sections have been securely recorded. Your final report is being finalized."
                  : "Excellent work! Your objective answers have been securely recorded. Final grading will occur after you complete the Theory section."}
              </p>
            </div>

        {/* QUICK STATS PANEL */}
        <div className="glass-card flex items-center justify-between p-6 rounded-[2rem] border border-white/10 shadow-soft mb-10">
          <div className="flex flex-col items-center flex-1 border-r border-white/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-2">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="font-display text-2xl font-extrabold text-white">
              {answeredCount} / {totalCount}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
              Answered
            </p>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-2">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <p className="font-display text-2xl font-extrabold text-white">
              Secure
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
              Status
            </p>
          </div>
        </div>

        {/* NEXT STEPS */}
        <div className="space-y-4">
          <Button
            size="lg"
            disabled={theoryCompleted && status !== 'graded'}
            onClick={() => {
              if (status === 'graded') {
                navigate("/exam/results", { state: { attemptId } });
              } else if (!theoryCompleted) {
                handleProceedToTheory();
              }
            }}
            className={`w-full h-14 rounded-2xl font-extrabold shadow-elevated transition-transform active:scale-95 disabled:opacity-50 ${
              status === 'graded' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow' : 'bg-white text-primary hover:bg-white/90'
            }`}
          >
            {status === 'graded'
              ? "View Final Results"
              : theoryCompleted
                ? "Finalizing Final Results..."
                : "Take Full Written Theory"}
            {status === 'graded' ? <ArrowRight className="ml-2 h-5 w-5" /> : <FileText className="ml-2 h-5 w-5" />}
          </Button>

          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm font-semibold text-muted-foreground hover:text-white transition-colors underline underline-offset-4"
          >
            Take a break and return to Dashboard
          </button>
        </div>
      </>
    )}
      </div>
    </div>
  );
};

export default MCQSubmitSuccess;
