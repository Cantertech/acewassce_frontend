import { useState, useEffect } from "react";
import { CheckCircle, ArrowRight, BrainCircuit, ScanSearch, FileCheck2, Loader2, Home, Clock, Sparkles, ShieldCheck } from "lucide-react";

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
    { icon: ScanSearch, text: "Scanning handwriting...", sub: "Detecting text and diagrams from your uploaded pages" },
    { icon: BrainCircuit, text: "Matching against rubric...", sub: "Comparing your workings to the WAEC marking scheme" },
    { icon: FileCheck2, text: "Finalizing scores...", sub: "Aggregating marks across all questions" },
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

    // Visual step progression
    const animation = setInterval(() => {
      setMarkingStep((prev) => (prev < MARKING_STEPS.length - 1 ? prev + 1 : prev));
    }, 6000);

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

  // ────────────────────────────────────────────
  // STATE 1: THEORY MARKED → MCQ PENDING
  // ────────────────────────────────────────────
  if (markingStatus === 'theory_marked' || (markingStatus !== 'pending' && !mcqCompleted)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 overflow-hidden relative">
        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/8 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-md text-center animate-fade-up">
          {/* Success badge */}
          <div className="mx-auto mb-8 relative inline-block">
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

          {/* Progress steps */}
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

          {/* Action buttons */}
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

  // ────────────────────────────────────────────
  // STATE 2: AI MARKING IN PROGRESS
  // ────────────────────────────────────────────
  const CurrentIcon = MARKING_STEPS[markingStep].icon;
  const isGraded = markingStatus === 'graded';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 overflow-hidden relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[30%] left-[10%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[130px] animate-pulse" />
        <div className="absolute top-[40%] right-[10%] h-[350px] w-[350px] rounded-full bg-emerald-600/8 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        {/* Title */}
        <h2 className="font-display text-xl font-extrabold text-white mb-1">
          {mcqCompleted ? "Generating Report" : "Theory Submitted"}
        </h2>
        <p className="text-xs text-muted-foreground mb-10 font-medium">
          {mcqCompleted
            ? "Both sections recorded. Finalizing your results..."
            : "Your workings are submitted. AI is reviewing..."}
        </p>

        {/* Animated scanner */}
        <div className="relative mx-auto mb-10 h-32 w-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-[spin_12s_linear_infinite]" />
          <div className="absolute inset-3 rounded-full border border-white/5 animate-[spin_6s_linear_infinite_reverse]" />
          <div className={`absolute inset-5 rounded-full flex items-center justify-center border transition-all duration-500 ${isGraded ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary/5 border-white/5'}`}>
            {isGraded ? (
              <CheckCircle className="h-10 w-10 text-emerald-400 animate-bounce" />
            ) : (
              <CurrentIcon className="h-10 w-10 text-primary animate-pulse" />
            )}
          </div>
        </div>

        {/* Step indicator */}
        {!isGraded && (
          <div className="mb-8">
            <p key={markingStep} className="text-sm font-bold text-white mb-1 animate-fade-up">
              {MARKING_STEPS[markingStep].text}
            </p>
            <p className="text-[11px] text-muted-foreground">{MARKING_STEPS[markingStep].sub}</p>
            <div className="flex justify-center gap-1.5 mt-4">
              {MARKING_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === markingStep ? 'w-7 bg-primary' : i < markingStep ? 'w-2 bg-primary/40' : 'w-2 bg-white/10'}`}
                />
              ))}
            </div>
          </div>
        )}

        {isGraded && (
          <div className="mb-8">
            <p className="text-sm font-bold text-emerald-400 mb-1">Results Ready!</p>
            <p className="text-[11px] text-muted-foreground">Your full forensic breakdown is available.</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Primary CTA */}
          <button
            disabled={mcqCompleted && !isGraded}
            onClick={() => {
              if (isGraded) {
                navigate("/exam/results", { state: { attemptId } });
              } else {
                handleStartMCQ();
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
              : mcqCompleted
                ? "Finalizing..."
                : "Continue to MCQs"}
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Status bar */}
          {error ? (
            <div className="flex items-center justify-center gap-2 text-xs text-rose-400 font-bold bg-rose-500/5 rounded-2xl py-3 border border-rose-500/10">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {error}
            </div>
          ) : !isGraded ? (
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold bg-white/[0.03] rounded-2xl py-3 border border-white/5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              AI processing in progress...
            </div>
          ) : null}

          {/* Secondary nav */}
          <div className="flex justify-center gap-6 pt-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-[11px] font-bold text-muted-foreground hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-[11px] font-bold text-muted-foreground hover:text-white transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TheorySubmitSuccess;
