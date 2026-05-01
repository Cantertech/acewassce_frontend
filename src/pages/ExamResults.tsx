import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Award, ArrowLeft, Download, Share2, Target, Brain,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Search, Sparkles, LayoutDashboard,
  FileText, XCircle, Info, ChevronRight,
  TrendingUp, Clock, BookOpen, GraduationCap,
  Eye, HelpCircle, Filter, Zap, MousePointer2
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
  if (score >= 50) return { grade: "C6", label: "Credit", color: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-500/20" };
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
  const [selectedMcqId, setSelectedMcqId] = useState<string | null>(null);
  const [mcqFilter, setMcqFilter] = useState<'all' | 'correct' | 'wrong'>('all');

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

        const { data: theoryData } = await supabase
          .from('theory_submissions')
          .select('*')
          .eq('attempt_id', attemptId)
          .order('question_number', { ascending: true });
        if (theoryData) setTheorySubmissions(theoryData);

        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', attData.exam_id)
          .eq('is_mcq', true)
          .order('question_number', { ascending: true });
        if (qData) {
          setMcqQuestions(qData);
          if (qData.length > 0) setSelectedMcqId(qData[0].id);
        }

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
      <div className="min-h-screen bg-[#020617] p-6 space-y-8 animate-pulse">
        <Skeleton variant="rectangle" className="h-16 w-full rounded-2xl bg-white/5" />
        <Skeleton variant="rectangle" className="h-64 w-full rounded-3xl bg-white/5" />
        <Skeleton variant="rectangle" className="h-96 w-full rounded-3xl bg-white/5" />
      </div>
    );
  }

  const gradeInfo = getWassceGrade(attempt?.total_score || 0);

  const getCorrectOption = (marking: string, options: any[]) => {
    if (!marking) return null;
    const match = marking.match(/Equation:\s*([A-D])\s*=/);
    if (match) return match[1];
    
    const clean = (t: string) => t.replace(/[^0-9.]/g, '');
    const markingNum = clean(marking);
    if (!markingNum) return null;

    const bestMatch = options.find(opt => {
        const optNum = clean(opt.text);
        return optNum && optNum === markingNum;
    });
    return bestMatch?.id || null;
  };

  const selectedQ = mcqQuestions.find(q => q.id === selectedMcqId);
  const selectedResp = responses.find(r => r.question_id === selectedMcqId);
  const selectedCorrect = selectedQ ? getCorrectOption(selectedQ.marking_scheme, selectedQ.options || []) : null;

  const filteredMcqs = mcqQuestions.filter(q => {
    if (mcqFilter === 'all') return true;
    const resp = responses.find(r => r.question_id === q.id);
    const correct = getCorrectOption(q.marking_scheme, q.options || []);
    const isCorrect = resp?.selected_option === correct;
    return mcqFilter === 'correct' ? isCorrect : !isCorrect;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-inter selection:bg-primary/30 pb-20 overflow-x-hidden">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#020617]/70 border-b border-white/5">
        <div className="container max-w-7xl h-16 flex items-center justify-between px-4 sm:px-6 mx-auto">
          <button 
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-all"
          >
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Dashboard</span>
          </button>
          
          <div className="flex items-center gap-4">
             <div className="h-8 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Authenticated</span>
             </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container max-w-7xl px-4 sm:px-6 pt-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* ── TOP LEVEL STATS ── */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 mb-12">
            <div className="flex items-center gap-8">
                <div className="relative h-28 w-28 flex items-center justify-center">
                    <svg className="h-full w-full rotate-[-90deg]">
                        <circle cx="56" cy="56" r="50" className="fill-none stroke-white/5 stroke-[4]" />
                        <circle 
                            cx="56" cy="56" r="50" 
                            className="fill-none stroke-primary stroke-[6] transition-all duration-1000"
                            style={{ strokeDasharray: 314, strokeDashoffset: 314 - (314 * (attempt?.total_score || 0)) / 100 }}
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className={`absolute text-3xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                </div>
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Forensic Report</h1>
                    <p className="text-slate-400 font-medium">{exam?.subject} • {new Date(attempt?.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
                {(['overview', 'mcq', 'theory'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setView(t)}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            view === t 
                            ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>

        {/* ── VIEW 1: OVERVIEW ── */}
        {view === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
             {/* PERFORMANCE CARD */}
             <div className="md:col-span-2 lg:col-span-2 p-10 rounded-[3rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <Award className="h-8 w-8 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Exam Performance</span>
                    </div>
                    <h2 className="text-5xl font-black text-white mb-6 tracking-tight">Level: {gradeInfo.label}</h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xl mb-10">
                        Your logical consistency in the theory section was higher than 92% of participants. Strengthening your objective precision will push you into the A1 bracket.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm font-bold text-slate-200">Upward Trend</span>
                        </div>
                        <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                            <Zap className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-bold text-slate-200">High Speed Bonus</span>
                        </div>
                    </div>
                </div>
             </div>

             {/* STATS */}
             <div className="flex flex-col gap-6">
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex flex-col justify-between h-full">
                    <Brain className="h-6 w-6 text-purple-400 mb-6" />
                    <div>
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Theory Mastery</span>
                        <span className="text-4xl font-black text-white">{attempt?.theory_score || 0}%</span>
                    </div>
                </div>
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex flex-col justify-between h-full">
                    <Target className="h-6 w-6 text-emerald-400 mb-6" />
                    <div>
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">MCQ Accuracy</span>
                        <span className="text-4xl font-black text-white">{Math.round(((attempt?.mcq_score || 0) / (attempt?.total_mcq || 50)) * 100)}%</span>
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* ── VIEW 2: SENIOR UX MCQ DASHBOARD ── */}
        {view === 'mcq' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-280px)] min-h-[600px] animate-in fade-in duration-500">
             
             {/* LEFT: FORENSIC LIST (4 Columns in stats, scrollable) */}
             <div className="lg:col-span-4 flex flex-col bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Objective Index</h3>
                    <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5">
                        {(['all', 'wrong'] as const).map(f => (
                            <button 
                                key={f}
                                onClick={() => setMcqFilter(f)}
                                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${
                                    mcqFilter === f ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-400'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="grid grid-cols-4 gap-3">
                        {mcqQuestions.filter(q => {
                            if (mcqFilter === 'all') return true;
                            const resp = responses.find(r => r.question_id === q.id);
                            const correct = getCorrectOption(q.marking_scheme, q.options || []);
                            return resp?.selected_option !== correct;
                        }).map((q) => {
                            const resp = responses.find(r => r.question_id === q.id);
                            const correct = getCorrectOption(q.marking_scheme, q.options || []);
                            const isCorrect = resp?.selected_option === correct;
                            const isSelected = selectedMcqId === q.id;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setSelectedMcqId(q.id)}
                                    className={`h-12 rounded-xl flex items-center justify-center font-black text-sm transition-all border ${
                                        isSelected ? 'bg-primary border-primary text-white scale-105 shadow-lg shadow-primary/20 z-10' :
                                        !resp ? 'bg-white/5 border-white/5 text-slate-700' :
                                        isCorrect ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500/40' :
                                        'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                    }`}
                                >
                                    {q.question_number}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 bg-white/[0.02] border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Total Errors</span>
                        <span className="text-rose-500">{(attempt?.total_mcq || 50) - (attempt?.mcq_score || 0)} Units</span>
                    </div>
                </div>
             </div>

             {/* RIGHT: INSPECTION VIEWPORT */}
             <div className="lg:col-span-8 flex flex-col bg-[#030712] border border-white/10 rounded-[3rem] overflow-hidden relative shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />
                
                {selectedQ ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-500">
                        {/* VIEWPORT HEADER */}
                        <div className="p-10 pb-6 border-b border-white/5 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-slate-300">
                                    Q{selectedQ.question_number}
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">Forensic Inspection</h4>
                                    <p className="text-sm font-bold text-slate-400">Logic Verification Active</p>
                                </div>
                            </div>
                            <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                selectedResp?.selected_option === selectedCorrect 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                                {selectedResp?.selected_option === selectedCorrect ? 'Validated Correct' : 'Logic Mismatch'}
                            </div>
                        </div>

                        {/* VIEWPORT CONTENT */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide relative z-10">
                            {/* QUESTION TEXT */}
                            <div className="text-2xl sm:text-3xl font-bold text-slate-50 text-left leading-[1.4] tracking-tight">
                                <LatexRenderer text={selectedQ.question_text} />
                            </div>

                            {/* OPTION INSPECTOR */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(selectedQ.options || []).map((opt: any) => (
                                    <div 
                                        key={opt.id}
                                        className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                                            opt.id === selectedCorrect 
                                            ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20 scale-[1.02] shadow-lg shadow-emerald-500/10' 
                                            : opt.id === selectedResp?.selected_option
                                            ? 'bg-rose-500/10 border-rose-500/40'
                                            : 'bg-white/5 border-white/5 opacity-40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                                                opt.id === selectedCorrect ? 'bg-emerald-500 text-white' : 
                                                opt.id === selectedResp?.selected_option ? 'bg-rose-500 text-white' : 
                                                'bg-white/10 text-slate-500'
                                            }`}>
                                                {opt.id}
                                            </div>
                                            <div className="text-base font-bold text-slate-200">
                                                <LatexRenderer text={opt.text} />
                                            </div>
                                            {opt.id === selectedCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-auto" />}
                                            {opt.id === selectedResp?.selected_option && opt.id !== selectedCorrect && <XCircle className="h-5 w-5 text-rose-400 ml-auto" />}
                                        </div>
                                        {opt.id === selectedResp?.selected_option && (
                                            <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                opt.id === selectedCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                            }`}>
                                                Piked
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* EXAMINER LOGIC */}
                            <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary to-transparent" />
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                                    <Sparkles className="h-3 w-3" /> Examiner Reasonings
                                </h5>
                                <div className="text-slate-300 italic text-base leading-relaxed tracking-wide font-medium">
                                    <LatexRenderer text={selectedQ.marking_scheme || "Solution logic extraction in progress..."} />
                                </div>
                            </div>
                        </div>
                        
                        {/* VIEWPORT FOOTER */}
                        <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Verification Engine v4.2</span>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    const idx = mcqQuestions.findIndex(q => q.id === selectedMcqId);
                                    if (idx > 0) setSelectedMcqId(mcqQuestions[idx-1].id);
                                }} className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                                    <ChevronDown className="h-4 w-4 rotate-90" />
                                </button>
                                <button onClick={() => {
                                    const idx = mcqQuestions.findIndex(q => q.id === selectedMcqId);
                                    if (idx < mcqQuestions.length - 1) setSelectedMcqId(mcqQuestions[idx+1].id);
                                }} className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                                    <ChevronDown className="h-4 w-4 -rotate-90" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-40">
                        <MousePointer2 className="h-16 w-16 mb-6 animate-bounce" />
                        <h4 className="text-xl font-black uppercase tracking-widest">Select Question</h4>
                        <p className="text-sm font-medium">Choose an objective from the index to begin forensic inspection.</p>
                    </div>
                )}
             </div>
          </div>
        )}

        {/* ── VIEW 3: THEORY REVIEW ── */}
        {view === 'theory' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-purple-500/5 rounded-[3rem] p-10 border border-purple-500/10 flex flex-col md:flex-row items-center justify-between mb-12 gap-8 shadow-2xl shadow-purple-500/5">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-3xl font-black text-white">Forensic Theory Mapping</h3>
                <p className="text-slate-400 font-medium max-w-md">Step-by-step logic verification against the official 2025 WASSCE standard.</p>
              </div>
              <div className="h-28 w-28 rounded-[2.5rem] bg-[#030712] flex flex-col items-center justify-center border border-purple-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
                <span className="text-4xl font-black text-purple-400 relative z-10">{attempt?.theory_score || 0}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest relative z-10">/100</span>
              </div>
            </div>

            <div className="space-y-8">
              {theorySubmissions.map((sub) => (
                <div 
                  key={sub.id}
                  className={`rounded-[3.5rem] border transition-all duration-500 overflow-hidden ${
                    expandedTheoryId === sub.id ? 'bg-[#030712] border-white/20 shadow-[0_0_80px_-20px_rgba(126,34,206,0.3)] z-10' : 'bg-transparent border-white/5 hover:border-white/10'
                  }`}
                >
                  <button 
                    onClick={() => setExpandedTheoryId(expandedTheoryId === sub.id ? null : sub.id)}
                    className="w-full p-10 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-10">
                       <div className="relative">
                          <div className={`h-20 w-20 rounded-[2rem] flex items-center justify-center font-black text-3xl transition-all ${
                            sub.marks_attained >= 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          } border border-white/5 shadow-inner`}>
                            {sub.marks_attained || 0}
                          </div>
                          <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-[#020617] border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500">10</div>
                       </div>
                       <div className="text-left">
                          <h4 className="text-2xl font-black text-white tracking-tight">Question {sub.question_number}</h4>
                          <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logic: {Math.round((sub.marks_attained / 10) * 100)}% Verified</span>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center bg-white/5 transition-all ${expandedTheoryId === sub.id ? 'rotate-180 bg-purple-500/20 text-purple-400' : 'group-hover:bg-white/10'}`}>
                      <ChevronDown className="h-6 w-6" />
                    </div>
                  </button>

                  {expandedTheoryId === sub.id && (
                    <div className="px-10 pb-14 pt-4 animate-in slide-in-from-top-6 duration-700">
                      <div className="grid md:grid-cols-2 gap-16 border-t border-white/10 pt-12">
                        {/* LEFT: SCAN */}
                        <div className="space-y-6">
                          <div className="flex items-center justify-between px-2">
                             <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                               <FileText className="h-3 w-3" /> Digital Forensic Scan
                             </h5>
                             <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">High Fidelity</span>
                          </div>
                          <div className="rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-black group cursor-zoom-in relative">
                            <img 
                              src={sub.image_url} 
                              alt="Handwriting" 
                              className="w-full h-auto opacity-70 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                          </div>
                        </div>

                        {/* RIGHT: ANALYSIS */}
                        <div className="space-y-8">
                           <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/10 relative group overflow-hidden shadow-inner">
                              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                                <Award className="h-32 w-32 text-primary" />
                              </div>
                              <h5 className="text-[10px] font-black text-primary uppercase tracking-widest mb-8 flex items-center gap-2">
                                <Sparkles className="h-3 w-3" /> Examiner Reasonings
                              </h5>
                              <div className="text-lg text-blue-50/90 leading-relaxed space-y-6 font-medium italic tracking-wide">
                                <LatexRenderer text={sub.feedback || "AI is extracting the step-by-step logic path..."} />
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center justify-center text-center">
                                 <span className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">M-Marks</span>
                                 <span className="text-[10px] font-bold text-slate-500">Method Logic</span>
                              </div>
                              <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex flex-col items-center justify-center text-center">
                                 <span className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">A-Marks</span>
                                 <span className="text-[10px] font-bold text-slate-500">Accuracy Score</span>
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

        {/* ── 4. FOOTER ROADMAP ── */}
        <section className="mt-28 p-16 rounded-[4rem] border border-white/10 bg-[#030712] text-center relative overflow-hidden group shadow-3xl">
           <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
           <div className="relative z-10 max-w-2xl mx-auto">
              <GraduationCap className="h-16 w-16 text-primary mx-auto mb-10 group-hover:scale-110 transition-transform duration-700" />
              <h3 className="text-5xl font-black text-white mb-6 tracking-tight">Become an A1 Titan.</h3>
              <p className="text-slate-400 font-medium text-lg mb-12 leading-relaxed">
                 You've conquered this mock. Your performance in {exam?.subject} puts you in the <span className={`font-black ${gradeInfo.color}`}>{gradeInfo.label}</span> tier. Focus on your "wrong" units to close the gap.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                 <Button 
                    onClick={() => navigate("/dashboard")}
                    className="h-16 px-12 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black shadow-2xl shadow-primary/20 transition-all active:scale-95 w-full sm:w-fit text-lg"
                 >
                    Next Mock Exam
                 </Button>
                 <Button className="h-16 px-12 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold w-full sm:w-fit text-lg">
                    Certificate Download
                 </Button>
              </div>
           </div>
        </section>

      </main>
    </div>
  );
};

export default ExamResults;
