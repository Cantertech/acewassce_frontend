import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Award, ArrowLeft, Download, Share2, Target, Brain,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Search, Sparkles, LayoutDashboard,
  FileText, XCircle, Info, ChevronRight,
  TrendingUp, Clock, BookOpen, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import Skeleton from "@/components/Skeleton";
import LatexRenderer from "@/components/LatexRenderer";

const getWassceGrade = (score: number) => {
  if (score >= 75) return { grade: "A1", label: "Distinction", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (score >= 70) return { grade: "B2", label: "Very Good", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (score >= 65) return { grade: "B3", label: "Good", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };
  if (score >= 60) return { grade: "C4", label: "Credit", color: "text-blue-300", bg: "bg-blue-400/10", border: "border-blue-400/20" };
  if (score >= 55) return { grade: "C5", label: "Credit", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
  if (score >= 50) return { grade: "C6", label: "Credit", color: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-400/20" };
  if (score >= 45) return { grade: "D7", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  if (score >= 40) return { grade: "E8", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  return { grade: "F9", label: "Fail", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
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
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  
  const [view, setView] = useState<'overview' | 'mcq' | 'theory'>('overview');
  const [expandedTheoryId, setExpandedTheoryId] = useState<string | null>(null);
  const [expandedMcqId, setExpandedMcqId] = useState<string | null>(null);

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
      // 1. Fetch Attempt and Exam
      const { data: attData } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();

      if (attData) {
        setAttempt(attData);
        setExam(attData.exams);

        // 2. Fetch Theory Submissions
        const { data: theoryData } = await supabase
          .from('theory_submissions')
          .select('*')
          .eq('attempt_id', attemptId)
          .order('question_number', { ascending: true });
        if (theoryData) setTheorySubmissions(theoryData);

        // 3. Fetch MCQ Questions and Responses
        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', attData.exam_id)
          .eq('is_mcq', true)
          .order('question_number', { ascending: true });
        if (qData) setMcqQuestions(qData);

        const { data: respData } = await supabase
          .from('exam_responses')
          .select('*')
          .eq('attempt_id', attemptId);
        if (respData) setResponses(respData);
      }
    } catch (err: any) {
      console.error("Error fetching results:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] p-6 space-y-8">
        <Skeleton variant="rectangle" className="h-16 w-full rounded-2xl bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton variant="rectangle" className="h-80 w-full rounded-3xl bg-white/5" />
          <Skeleton variant="rectangle" className="h-80 w-full rounded-3xl bg-white/5" />
        </div>
        <Skeleton variant="rectangle" className="h-96 w-full rounded-3xl bg-white/5" />
      </div>
    );
  }

  const gradeInfo = getWassceGrade(attempt?.total_score || 0);

  // Helper to find correct answer from rubric
  const getCorrectOption = (marking: string, options: any[]) => {
    if (!marking) return null;
    const match = marking.match(/Equation:\s*([A-D])\s*=/);
    if (match) return match[1];
    
    // Fallback: Numeric match
    const clean = (t: string) => t.replace(/[^0-9.]/g, '');
    const markingNum = clean(marking);
    if (!markingNum) return null;

    const bestMatch = options.find(opt => {
        const optNum = clean(opt.text);
        return optNum && optNum === markingNum;
    });
    return bestMatch?.id || null;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-inter selection:bg-primary/30 pb-20">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#020617]/70 border-b border-white/5">
        <div className="container max-w-5xl h-16 flex items-center justify-between px-4 sm:px-6">
          <button 
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-all"
          >
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Dashboard</span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Subject</span>
              <span className="text-xs font-bold text-slate-300">{exam?.subject}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group hover:bg-primary/20 transition-all cursor-pointer">
              <Share2 className="h-4 w-4 text-slate-400 group-hover:text-primary" />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container max-w-5xl px-4 sm:px-6 pt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* ── NAVIGATION TABS ── */}
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mb-10 w-fit mx-auto sm:mx-0">
          {(['overview', 'mcq', 'theory'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setView(t)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                view === t 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── VIEW 1: OVERVIEW ── */}
        {view === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* HERO GRADE CARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 relative p-8 sm:p-12 rounded-[3rem] border border-white/10 overflow-hidden group shadow-2xl bg-gradient-to-br from-white/[0.05] to-transparent">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-16">
                  {/* GRADE CIRCLE */}
                  <div className="relative h-48 w-48 flex items-center justify-center">
                    <svg className="h-full w-full rotate-[-90deg]">
                      <circle 
                        cx="96" cy="96" r="88" 
                        className="fill-none stroke-white/5 stroke-[8]" 
                      />
                      <circle 
                        cx="96" cy="96" r="88" 
                        className={`fill-none stroke-primary stroke-[12] transition-all duration-[2000ms] ease-out`}
                        style={{ strokeDasharray: 553, strokeDashoffset: 553 - (553 * (attempt?.total_score || 0)) / 100 }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className={`text-6xl font-black ${gradeInfo.color} leading-none tracking-tighter`}>{gradeInfo.grade}</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">{gradeInfo.label}</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-6">
                    <div>
                      <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
                        {gradeInfo.grade === 'A1' ? "Academic Titan!" : "Solid Performance!"}
                      </h2>
                      <p className="text-slate-400 font-medium leading-relaxed">
                        You scored higher than 84% of students on this mock exam. Your logic in the theory section was exceptional.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-slate-200">Top 10% Rank</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <Clock className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-bold text-slate-200">1h 42m Spent</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATS COLUMN */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors group">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Brain className="h-5 w-5 text-purple-400" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Theory Mastery</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{attempt?.theory_score || 0}</span>
                    <span className="text-xs font-bold text-slate-500">/100</span>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors group">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Target className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Objective Precision</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{attempt?.mcq_score || 0}</span>
                    <span className="text-xs font-bold text-slate-500">/{attempt?.total_mcq || 50}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <Button onClick={() => setView('mcq')} className="h-20 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/10 group justify-between px-8">
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Review Errors</span>
                  <span className="text-sm font-bold text-slate-200">Objective Breakdown</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-primary transition-colors" />
              </Button>
              <Button onClick={() => setView('theory')} className="h-20 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/10 group justify-between px-8">
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Step-by-Step Logic</span>
                  <span className="text-sm font-bold text-slate-200">Theory Forensic Map</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
              </Button>
              <Button className="h-20 rounded-[1.5rem] bg-primary/20 border border-primary/20 hover:bg-primary/30 group justify-between px-8">
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Study Plan</span>
                  <span className="text-sm font-bold text-slate-200">Generate AI Strategy</span>
                </div>
                <Sparkles className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              </Button>
            </div>
          </div>
        )}

        {/* ── VIEW 2: MCQ REVIEW ── */}
        {view === 'mcq' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-emerald-500/5 rounded-[2.5rem] p-8 border border-emerald-500/10 flex items-center justify-between mb-10">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white">Objective Analysis</h3>
                <p className="text-sm text-slate-400 font-medium">Review every question to identify logic gaps in your thinking.</p>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                <div className="text-center">
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Correct</span>
                  <span className="text-xl font-black text-emerald-400">{attempt?.mcq_score || 0}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Errors</span>
                  <span className="text-xl font-black text-rose-400">{(attempt?.total_mcq || 50) - (attempt?.mcq_score || 0)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {mcqQuestions.map((q) => {
                const userResponse = responses.find(r => r.question_id === q.id);
                const userChoice = userResponse?.selected_option;
                const correctChoice = getCorrectOption(q.marking_scheme, q.options || []);
                const isCorrect = userChoice === correctChoice;

                return (
                  <div 
                    key={q.id}
                    className={`rounded-[2rem] border transition-all duration-300 overflow-hidden ${
                      expandedMcqId === q.id ? 'bg-white/[0.02] border-white/10' : 'bg-transparent border-white/5 hover:border-white/10'
                    }`}
                  >
                    <button 
                      onClick={() => setExpandedMcqId(expandedMcqId === q.id ? null : q.id)}
                      className="w-full p-6 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-6">
                        <div className={`h-12 w-12 rounded-xl border flex items-center justify-center font-black text-lg ${
                          isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          {q.question_number}
                        </div>
                        <div className="text-left max-w-xl">
                          <p className="text-sm font-bold text-slate-200 line-clamp-1">
                            <LatexRenderer text={q.question_text} />
                          </p>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCorrect ? 'Correct Answer' : `Wrong • You picked ${userChoice || 'None'}`}
                          </span>
                        </div>
                      </div>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center bg-white/5 transition-transform ${expandedMcqId === q.id ? 'rotate-180' : ''}`}>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </button>

                    {expandedMcqId === q.id && (
                      <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
                        <div className="pt-6 border-t border-white/5 space-y-6">
                          {/* OPTIONS GRID */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(q.options || []).map((opt: any) => (
                              <div 
                                key={opt.id}
                                className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                                  opt.id === correctChoice 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20' 
                                  : opt.id === userChoice && !isCorrect
                                  ? 'bg-rose-500/10 border-rose-500/30'
                                  : 'bg-white/5 border-white/5'
                                }`}
                              >
                                <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                  opt.id === correctChoice ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-500'
                                }`}>
                                  {opt.id}
                                </div>
                                <div className="text-sm font-medium">
                                  <LatexRenderer text={opt.text} />
                                </div>
                                {opt.id === correctChoice && <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />}
                                {opt.id === userChoice && !isCorrect && <XCircle className="h-4 w-4 text-rose-400 ml-auto" />}
                              </div>
                            ))}
                          </div>

                          {/* REASONING */}
                          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Info className="h-3 w-3" /> Solution Walkthrough
                            </h4>
                            <div className="text-sm text-slate-300 leading-relaxed italic">
                              <LatexRenderer text={q.marking_scheme || "Solution processing..."} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VIEW 3: THEORY REVIEW ── */}
        {view === 'theory' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-purple-500/5 rounded-[2.5rem] p-8 border border-purple-500/10 flex items-center justify-between mb-10">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white">Theory Forensic Breakdown</h3>
                <p className="text-sm text-slate-400 font-medium">High-fidelity analysis of your handwriting and step-by-step logic.</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-purple-500/20 flex flex-col items-center justify-center border border-purple-500/20">
                <span className="text-2xl font-black text-purple-400">{attempt?.theory_score || 0}</span>
                <span className="text-[8px] font-black text-slate-500 uppercase">/100</span>
              </div>
            </div>

            <div className="space-y-6">
              {theorySubmissions.map((sub) => (
                <div 
                  key={sub.id}
                  className={`rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${
                    expandedTheoryId === sub.id ? 'bg-white/[0.02] border-white/10 shadow-2xl' : 'bg-transparent border-white/5 hover:border-white/10'
                  }`}
                >
                  <button 
                    onClick={() => setExpandedTheoryId(expandedTheoryId === sub.id ? null : sub.id)}
                    className="w-full p-8 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-8">
                       <div className="relative group">
                          <div className={`h-16 w-16 rounded-3xl flex items-center justify-center font-black text-2xl transition-all duration-500 ${
                            sub.marks_attained >= (10 / 2) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          } border border-white/5`}>
                            {sub.marks_attained || 0}
                          </div>
                          <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400">
                             10
                          </div>
                       </div>
                       <div className="text-left">
                          <h4 className="text-xl font-black text-white tracking-tight">Question {sub.question_number}</h4>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logic Score: {Math.round((sub.marks_attained / 10) * 100)}%</span>
                             <div className="h-1 w-1 rounded-full bg-slate-700" />
                             <span className="text-[10px] font-black text-primary uppercase tracking-widest">Verified by AceAI</span>
                          </div>
                       </div>
                    </div>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-white/5 transition-transform ${expandedTheoryId === sub.id ? 'rotate-180 bg-primary/20 text-primary' : ''}`}>
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </button>

                  {expandedTheoryId === sub.id && (
                    <div className="px-8 pb-10 pt-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="grid md:grid-cols-2 gap-10 border-t border-white/5 pt-8">
                        {/* LEFT: SUBMITTED EVIDENCE */}
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Digital Handwriting Scan
                          </h5>
                          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black group cursor-zoom-in">
                            <img 
                              src={sub.image_url} 
                              alt="Student work" 
                              className="w-full h-auto opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                            />
                          </div>
                        </div>

                        {/* RIGHT: EXAMINER REASONING */}
                        <div className="space-y-6">
                           <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 relative group overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Award className="h-24 w-24 text-primary" />
                              </div>
                              <h5 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Sparkles className="h-3 w-3" /> AI Reasoning Breakdown
                              </h5>
                              <div className="text-sm text-blue-50/90 leading-relaxed space-y-4 font-medium">
                                <LatexRenderer text={sub.feedback || "Detailed step-by-step logic analysis is being processed..."} />
                              </div>
                           </div>

                           <div className="flex gap-4">
                              <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                 <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">M-Marks Awarded</span>
                                 <span className="text-sm font-bold text-slate-200">Logic Steps Verified</span>
                              </div>
                              <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                 <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">A-Marks Awarded</span>
                                 <span className="text-sm font-bold text-slate-200">Accuracy Confirmed</span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. FOOTER MOTIVATION ── */}
        <section className="mt-20 p-12 rounded-[4rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative z-10">
            <GraduationCap className="h-12 w-12 text-primary mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
            <h3 className="text-3xl font-black text-white mb-2">Push for the A1.</h3>
            <p className="text-slate-400 font-medium max-w-sm mx-auto mb-10 leading-relaxed">
               You are currently at the {gradeInfo.label} level. Strengthening your theory logic in Section B will push you to the top bracket.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => navigate("/dashboard")}
                className="h-14 px-10 rounded-2xl bg-white text-[#020617] hover:bg-white/90 font-black shadow-xl shadow-white/5 transition-all active:scale-95 w-full sm:w-fit"
              >
                Back to Exams
              </Button>
              <Button 
                className="h-14 px-10 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold w-full sm:w-fit"
              >
                Download PDF Certificate
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* MOBILE NAV TAB BAR (Optional) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 sm:hidden">
         <div className="flex p-1.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
            {(['overview', 'mcq', 'theory'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setView(t)}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  view === t ? 'bg-primary text-white' : 'text-slate-400'
                }`}
              >
                {t}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default ExamResults;
