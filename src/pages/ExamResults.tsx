import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Award, ArrowLeft, Download, Share2, Target, Brain, 
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, 
  Search, Sparkles, LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import Skeleton from "@/components/Skeleton";
import LatexRenderer from "@/components/LatexRenderer";

const getWassceGrade = (score: number) => {
  if (score >= 80) return { grade: "A1", label: "Excellent", color: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (score >= 70) return { grade: "B2", label: "Very Good", color: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (score >= 60) return { grade: "B3", label: "Good", color: "text-blue-400", bg: "bg-blue-500/10" };
  if (score >= 55) return { grade: "C4", label: "Credit", color: "text-blue-300", bg: "bg-blue-400/10" };
  if (score >= 50) return { grade: "C5", label: "Credit", color: "text-amber-400", bg: "bg-amber-500/10" };
  if (score >= 45) return { grade: "C6", label: "Credit", color: "text-amber-300", bg: "bg-amber-400/10" };
  if (score >= 40) return { grade: "D7", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10" };
  if (score >= 35) return { grade: "E8", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10" };
  return { grade: "F9", label: "Fail", color: "text-red-500", bg: "bg-red-500/10" };
};

const ExamResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { attemptId?: string } | null;
  const attemptId = state?.attemptId;

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [theorySubmissions, setTheorySubmissions] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showWrongMCQs, setShowWrongMCQs] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data: attData } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();
      
      if (attData) {
        setAttempt(attData);
        setExam(attData.exams);
      }

      const { data: theoryData } = await supabase
        .from('theory_submissions')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('question_number', { ascending: true });
      
      if (theoryData) {
        setTheorySubmissions(theoryData);
      }
    } catch (err: any) {
      console.error("Error fetching results:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] p-6 space-y-10 animate-pulse">
        <Skeleton variant="rectangle" className="h-12 w-full rounded-2xl bg-white/5" />
        <div className="flex flex-col items-center gap-4">
           <Skeleton variant="circle" className="h-32 w-32 bg-white/5" />
           <Skeleton variant="text" className="h-8 w-1/2 bg-white/5" />
        </div>
        <Skeleton variant="rectangle" className="h-64 w-full rounded-[2.5rem] bg-white/5" />
      </div>
    );
  }

  const gradeInfo = getWassceGrade(attempt?.total_score || 0);
  const wrongMCQs = attempt?.wrong_mcq_numbers || [];

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-foreground flex flex-col pb-24 overflow-x-hidden font-inter">
      {/* ── CELEBRATION OVERLAY ── */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent animate-pulse" />
      </div>

      {/* ── BACKGROUND MESH ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-600/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0B0F1A]/80 backdrop-blur-xl">
        <div className="container flex h-16 max-w-3xl items-center justify-between px-4">
          <button 
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span>Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
             <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Certified Result</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 container px-4 sm:px-6 max-w-3xl mx-auto mt-12 animate-fade-up">
        
        {/* ── 1. MOTIVATIONAL HERO ── */}
        <section className="text-center mb-16">
           <div className={`mx-auto flex h-32 w-32 items-center justify-center rounded-[2.5rem] ${gradeInfo.bg} border border-white/10 mb-8 shadow-glow relative group`}>
              <Award className={`h-16 w-16 ${gradeInfo.color} transition-transform group-hover:scale-110 duration-500`} />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-amber-400 animate-bounce" />
           </div>
           
           <h1 className="font-display text-5xl font-black text-white tracking-tight mb-4">
             {gradeInfo.grade === 'A1' ? "Unstoppable!" : gradeInfo.grade.startsWith('B') ? "Excellent Work!" : "Well Done!"}
           </h1>
           <p className="text-lg text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
             You've successfully conquered the {exam?.subject} mock exam. Here is your forensic performance breakdown.
           </p>
        </section>

        {/* ── 2. SCORE ARCHITECTURE ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
           <div className="glass-card rounded-[2rem] p-6 border border-white/5 flex flex-col items-center text-center group hover:bg-white/5 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Score</p>
              <p className="text-4xl font-black text-white leading-none">{attempt?.total_score || 0}%</p>
              <span className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${gradeInfo.bg} ${gradeInfo.color}`}>{gradeInfo.grade}</span>
           </div>

           <div className="glass-card rounded-[2rem] p-6 border border-white/5 flex flex-col items-center text-center group hover:bg-white/5 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Theory Section</p>
              <p className="text-3xl font-black text-white leading-none">{attempt?.theory_score || 0}<span className="text-xs text-muted-foreground">/100</span></p>
              <p className="mt-2 text-[10px] font-bold text-muted-foreground uppercase">Written Mark</p>
           </div>

           <div className="glass-card rounded-[2rem] p-6 border border-white/5 flex flex-col items-center text-center group hover:bg-white/5 transition-colors relative overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Objectives</p>
              <p className="text-3xl font-black text-white leading-none">{attempt?.mcq_score || 0}<span className="text-xs text-muted-foreground">/{attempt?.total_mcq || 50}</span></p>
              
              <button 
                onClick={() => setShowWrongMCQs(true)}
                className="mt-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:underline decoration-emerald-400/30"
              >
                View Errors ✕
              </button>
           </div>
        </div>

        {/* ── 3. THEORY FORENSICS ── */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="font-display text-2xl font-black text-white">Theory Review</h3>
              <div className="h-px flex-1 mx-6 bg-white/5" />
              <LayoutDashboard className="h-5 w-5 text-muted-foreground/30" />
           </div>

           <div className="space-y-4">
              {theorySubmissions.map((sub) => (
                <div 
                  key={sub.id} 
                  className={`glass-card rounded-[2rem] border transition-all duration-500 overflow-hidden ${expandedId === sub.id ? 'border-primary/40 ring-1 ring-primary/20 bg-white/[0.02]' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.01]'}`}
                >
                  <button 
                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <div className="flex items-center gap-5">
                       <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl ${sub.score >= (sub.max_marks / 2) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} border border-white/5 shadow-inner`}>
                         {sub.score || 0}
                       </div>
                       <div>
                          <p className="text-base font-black text-white tracking-tight">Question {sub.question_number}</p>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Achieved {sub.score} / {sub.max_marks || 10}</p>
                       </div>
                    </div>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center bg-white/5 transition-transform duration-300 ${expandedId === sub.id ? 'rotate-180' : ''}`}>
                       <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>

                  {expandedId === sub.id && (
                    <div className="px-6 pb-8 animate-fade-up">
                       <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                          {/* WORK PREVIEW */}
                          <div className="space-y-4">
                             <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                               <FileText className="h-3 w-3" /> Submitted Evidence
                             </h4>
                             <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl group cursor-zoom-in">
                                <img 
                                  src={sub.image_url} 
                                  alt="Work" 
                                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                             </div>
                          </div>

                          {/* AI REASONING */}
                          <div className="space-y-4">
                             <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                               <Sparkles className="h-3 w-3" /> Examiner Breakdown
                             </h4>
                             <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 relative">
                                <div className="absolute top-4 right-4 opacity-10">
                                   <Brain className="h-12 w-12 text-primary" />
                                </div>
                                <div className="text-sm text-blue-100/90 leading-relaxed font-medium">
                                  <LatexRenderer text={sub.feedback || "Detailed step-by-step logic analysis is being processed..."} />
                                </div>
                             </div>
                             <div className="flex items-center gap-2 px-2 opacity-60">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Validated by AceAI v4.2</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              ))}
           </div>
        </section>

        {/* ── 4. FINAL MOTIVATION ── */}
        <section className="mt-20 p-10 glass-card rounded-[3rem] border border-primary/20 text-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-50" />
           <Sparkles className="h-10 w-10 text-amber-400 mx-auto mb-6 group-hover:rotate-12 transition-transform" />
           <h3 className="font-display text-2xl font-black text-white mb-2">Ready for the real WASSCE?</h3>
           <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8 font-medium">
             Your performance shows strong logic in {exam?.subject}. Keep practicing to turn that {gradeInfo.grade} into an A1 in the main exam!
           </p>
           <Button 
             onClick={() => navigate("/dashboard")}
             className="h-14 px-10 rounded-2xl bg-white text-primary hover:bg-white/90 font-black shadow-glow transition-all active:scale-95"
           >
             Return to Dashboard
           </Button>
        </section>

      </main>

      {/* ── WRONG MCQ MODAL ── */}
      {showWrongMCQs && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowWrongMCQs(false)} />
           <div className="relative glass-card w-full max-w-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
              <h2 className="font-display text-3xl font-black text-white mb-2">Objective Errors</h2>
              <p className="text-sm text-muted-foreground mb-8">You missed the following questions. Review these topics in your textbook.</p>
              
              <div className="flex flex-wrap gap-3 mb-10">
                 {wrongMCQs.length > 0 ? wrongMCQs.map((num: any) => (
                   <div key={num} className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center font-black text-rose-400 text-lg">
                      {num}
                   </div>
                 )) : (
                   <p className="text-emerald-400 font-bold">Perfect score! No errors found. 🎉</p>
                 )}
              </div>

              <Button 
                onClick={() => setShowWrongMCQs(false)}
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold"
              >
                Close Report
              </Button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExamResults;
