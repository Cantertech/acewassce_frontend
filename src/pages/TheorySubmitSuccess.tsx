import { useState, useEffect } from "react";
import { CheckCircle, ArrowRight, BrainCircuit, ScanSearch, FileCheck2, Loader2, Home, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";

const TheorySubmitSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { attemptId?: string, mcqCompleted?: boolean, examId?: string } | null;
  const attemptId = state?.attemptId;
  const [examId, setExamId] = useState(state?.examId);
  const [mcqCompleted, setMcqCompleted] = useState(state?.mcqCompleted ?? false);

  const [markingStep, setMarkingStep] = useState(0);
  const [markingStatus, setMarkingStatus] = useState<string>('pending');
  const [error, setError] = useState<string | null>(null);

  const MARKING_STEPS = [
    { icon: ScanSearch,   label: "Scanning Handwriting",    desc: "Reading your uploaded pages and detecting text, symbols & diagrams" },
    { icon: BrainCircuit, label: "Matching Marking Scheme", desc: "Comparing your workings against the WAEC official rubric" },
    { icon: FileCheck2,   label: "Awarding Marks",          desc: "Calculating earned and lost marks per sub-question" },
  ];

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }

    const fetchData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('exam_attempts')
          .select('status, exam_id, mcq_completed_at')
          .eq('id', attemptId)
          .single();

        if (fetchError) throw fetchError;

        setMarkingStatus(data.status);
        if (!examId) setExamId(data.exam_id);
        if (data.mcq_completed_at) setMcqCompleted(true);

        // Auto-redirect when fully graded
        if (data.status === 'graded') {
          navigate("/exam/results", { state: { attemptId } });
          return;
        }
      } catch (err: any) {
        console.error("Fetch error:", err.message);
        setError("Connection lost. Retrying...");
      }
    };

    fetchData();
    const polling = setInterval(fetchData, 3000);

    // Cycle through visual steps every 5s
    const animation = setInterval(() => {
      setMarkingStep((prev) => (prev < MARKING_STEPS.length - 1 ? prev + 1 : prev));
    }, 5000);

    return () => {
      clearInterval(polling);
      clearInterval(animation);
    };
  }, [attemptId, navigate, examId]);

  const handleStartMCQ = () => {
    if (!examId || !attemptId) {
      setError("Exam metadata missing. Return to dashboard.");
      return;
    }
    navigate("/exam/mcq", { state: { attemptId, examId } });
  };

  const isTheoryMarked = markingStatus === 'theory_marked';
  const isGraded = markingStatus === 'graded';
  const CurrentStepIcon = MARKING_STEPS[markingStep].icon;

  // ─────────────────────────────────────────
  // STATE 1: THEORY MARKED → PROMPT MCQ
  // ─────────────────────────────────────────
  if (isTheoryMarked || (markingStatus !== 'pending' && !mcqCompleted)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 overflow-hidden relative">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/8 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-md text-center animate-fade-up">
          <div className="mx-auto mb-8">
            <div className="h-20 w-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            Theory Marked!
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-xs mx-auto">
            Your written papers are graded. Complete the <span className="text-white font-bold">MCQ section</span> to unlock your full result.
          </p>

          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Theory ✓</span>
            </div>
            <div className="h-px w-6 bg-white/10" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">MCQ Next</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleStartMCQ}
              className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-black text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Start MCQ Section
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" /> Save & Continue Later
            </button>
          </div>

          <p className="mt-8 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
            <Clock className="h-3 w-3" /> Progress saved automatically
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // STATE 2: AI IS ACTIVELY MARKING
  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 overflow-hidden relative">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[20%] left-[10%] h-[500px] w-[500px] rounded-full bg-primary/8 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[5%] h-[400px] w-[400px] rounded-full bg-purple-600/8 blur-[120px] animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center animate-fade-up">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">AI Marking Engine Active</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Marking Your Paper
          </h1>
          <p className="text-xs text-muted-foreground">
            {mcqCompleted
              ? "Both sections recorded — generating your final report..."
              : "Sit back while our AI reviews your workings against the WAEC rubric."}
          </p>
        </div>

        {/* Animated ring with step icon */}
        <div className="relative mx-auto mb-10 h-36 w-36 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-[spin_14s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-white/5 animate-[spin_8s_linear_infinite_reverse]" />
          <div className="absolute inset-6 rounded-full bg-primary/5 border border-primary/10 animate-pulse" />
          <div className="absolute inset-8 rounded-full bg-background/60 border border-white/10 flex items-center justify-center">
            <CurrentStepIcon className="h-9 w-9 text-primary animate-pulse" />
          </div>
        </div>

        {/* Active step label */}
        <div className="mb-8 px-4">
          <p key={markingStep} className="text-base font-extrabold text-white mb-1.5 animate-fade-up">
            {MARKING_STEPS[markingStep].label}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {MARKING_STEPS[markingStep].desc}
          </p>
          <div className="flex justify-center gap-2 mt-5">
            {MARKING_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-700 ${i === markingStep ? 'w-8 bg-primary' : i < markingStep ? 'w-3 bg-primary/40' : 'w-3 bg-white/10'}`}
              />
            ))}
          </div>
        </div>

        {/* Steps checklist */}
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 mb-6 space-y-3 text-left">
          {MARKING_STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < markingStep;
            const active = i === markingStep;
            return (
              <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-25'}`}>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${done ? 'bg-emerald-500/20' : active ? 'bg-primary/20' : 'bg-white/5'}`}>
                  {done ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Icon className={`h-4 w-4 ${active ? 'text-primary animate-pulse' : 'text-slate-500'}`} />
                  )}
                </div>
                <p className={`text-xs font-bold ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-500'}`}>{step.label}</p>
              </div>
            );
          })}
        </div>

        {/* Error / status bar */}
        {error ? (
          <div className="flex items-center justify-center gap-2 text-xs text-rose-400 font-bold bg-rose-500/5 rounded-2xl py-3 border border-rose-500/10 mb-4">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {error}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold bg-white/[0.03] rounded-2xl py-3 border border-white/5 mb-4">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            This may take 30–60 seconds
          </div>
        )}

        {/* Secondary links */}
        <div className="flex justify-center gap-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-[11px] font-bold text-muted-foreground hover:text-white transition-colors"
          >
            Save & Exit
          </button>
          <button
            onClick={() => navigate("/history")}
            className="text-[11px] font-bold text-muted-foreground hover:text-white transition-colors"
          >
            View History
          </button>
        </div>
      </div>
    </div>
  );
};

export default TheorySubmitSuccess;
