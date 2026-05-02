import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Play, CheckCircle2, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Skeleton from "@/components/Skeleton";

const ResumeExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { attemptId?: string; examId?: string } | null;

  const [attempt, setAttempt] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state?.attemptId) {
      navigate('/history');
      return;
    }

    async function fetchData() {
      try {
        const { data: attData, error: attError } = await supabase
          .from('exam_attempts')
          .select('*, exams(*)')
          .eq('id', state!.attemptId)
          .single();

        if (attError) throw attError;
        setAttempt(attData);
        setExam(attData.exams);
      } catch (err) {
        console.error("Error fetching attempt:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [state?.attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-8 animate-pulse">
        <Skeleton variant="rectangle" className="h-16 w-full max-w-3xl mx-auto rounded-2xl bg-white/5" />
        <Skeleton variant="rectangle" className="h-64 w-full max-w-3xl mx-auto rounded-3xl bg-white/5" />
      </div>
    );
  }

  if (!attempt) return null;

  const mcqDone = !!attempt.mcq_completed_at;
  const theoryDone = !!attempt.theory_completed_at;

  const resumeSection = (mode: 'mcq' | 'theory') => {
    navigate(`/exam/${mode}`, { state: { examId: exam.id, attemptId: attempt.id } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-inter">
      {/* ── BACKGROUND MESH ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[5%] -left-[10%] h-[500px] w-[500px] rounded-full bg-amber-600/5 blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[10%] h-[400px] w-[400px] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 max-w-3xl items-center px-4 mx-auto">
          <button 
            onClick={() => navigate('/history')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Clock className="h-3 w-3" /> In Progress
            </span>
            <h1 className="font-display text-sm font-extrabold text-white">Resume {exam?.subject || "Exam"}</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 container px-4 sm:px-6 max-w-3xl mx-auto mt-8 animate-fade-up">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white mb-2">Unfinished Exam</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            You still have sections remaining for your {exam?.title || "WASSCE Mock"}. Pick up right where you left off.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* MCQ Card */}
          <div className={`relative overflow-hidden rounded-[2rem] p-6 border transition-all ${mcqDone ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80' : 'bg-blue-500/10 border-blue-500/30 shadow-glow'}`}>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${mcqDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {mcqDone ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                {mcqDone && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Completed</span>}
              </div>
              <h3 className={`font-display text-xl font-bold mb-2 ${mcqDone ? 'text-emerald-50' : 'text-blue-50'}`}>Multiple Choice</h3>
              <p className="text-xs text-muted-foreground mb-8 flex-1">
                {mcqDone ? "Objective questions have been securely recorded." : "50 Objective questions. The timer will resume from where you stopped."}
              </p>
              
              <Button 
                disabled={mcqDone}
                onClick={() => resumeSection('mcq')}
                className={`w-full rounded-xl h-12 font-bold ${mcqDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'}`}
              >
                {mcqDone ? 'Saved' : 'Resume MCQs'}
                {!mcqDone && <Play className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Theory Card */}
          <div className={`relative overflow-hidden rounded-[2rem] p-6 border transition-all ${theoryDone ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80' : 'bg-purple-500/10 border-purple-500/30 shadow-glow'}`}>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${theoryDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                  {theoryDone ? <CheckCircle2 className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                </div>
                {theoryDone && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Completed</span>}
              </div>
              <h3 className={`font-display text-xl font-bold mb-2 ${theoryDone ? 'text-emerald-50' : 'text-purple-50'}`}>Theory / Written</h3>
              <p className="text-xs text-muted-foreground mb-8 flex-1">
                {theoryDone ? "Theory answers have been scanned and saved." : "Written workings. The timer will resume or prompt you to scan if time is up."}
              </p>
              
              <Button 
                disabled={theoryDone}
                onClick={() => resumeSection('theory')}
                className={`w-full rounded-xl h-12 font-bold ${theoryDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25'}`}
              >
                {theoryDone ? 'Saved' : 'Resume Theory'}
                {!theoryDone && <Play className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ResumeExam;
