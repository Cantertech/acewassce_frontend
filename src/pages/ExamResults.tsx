import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Award, ArrowLeft, Download, Share2, Target, Brain,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Search, Sparkles, LayoutDashboard,
  FileText, XCircle, Info, ChevronRight,
  TrendingUp, Clock, BookOpen, GraduationCap,
  ChevronLeft, List, Eye, Layers, Maximize2, RefreshCw, Terminal, Zap,
  Cpu, ShieldCheck, Activity
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
  if (score >= 50) return { grade: "C6", label: "Credit", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20" };
  if (score >= 45) return { grade: "D7", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  if (score >= 40) return { grade: "E8", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  return { grade: "F9", label: "Fail", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
};

const ExamResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const attemptId = (location.state as any)?.attemptId || searchParams.get('attemptId');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gradingMcq, setGradingMcq] = useState(false);
  const [attempt, setAttempt] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [theorySubmissions, setTheorySubmissions] = useState<any[]>([]);
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [theoryQuestions, setTheoryQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  
  const [view, setView] = useState<'overview' | 'mcq' | 'theory'>('overview');
  const [selectedTheoryId, setSelectedTheoryId] = useState<string | null>(null);
  const [selectedMcqId, setSelectedMcqId] = useState<string | null>(null);
  const [showMcqGrid, setShowMcqGrid] = useState(false);
  const [showTheoryGrid, setShowTheoryGrid] = useState(false);
  
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const syncTriggered = useRef(false);

  const addLog = (msg: string) => {
    console.log(`[SYSTEM LOG]: ${msg}`);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }
    fetchResults();
  }, [attemptId]);

  const fetchResults = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      addLog(`Syncing Attempt: ${attemptId}`);

      const { data: attData, error: attErr } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();

      if (attErr) {
          addLog(`Attempt Fetch Error: ${attErr.message} (Code: ${attErr.code})`);
          throw attErr;
      }

      if (attData) {
        setAttempt(attData);
        setExam(attData.exams);

        // HYBRID FETCH: Direct Supabase Fetch first (ultra-fast & robust since RLS is disabled), with Proxy fallback
        let theoryData: any[] = [];
        addLog("Querying theory_submissions directly from Supabase...");
        
        const { data: directTheory, error: directErr } = await supabase
          .from('theory_submissions')
          .select('*')
          .eq('attempt_id', attemptId);

        if (!directErr && directTheory && directTheory.length > 0) {
          theoryData = directTheory;
          addLog(`Direct Sync: ${theoryData.length} Theory Rows Verified directly from Supabase`);
        } else {
          if (directErr) {
            addLog(`Direct Supabase Fetch Error: ${directErr.message} (Code: ${directErr.code})`);
          }
          addLog("Falling back to backend proxy fetch...");
          
          const backendUrl = 'https://acewassce-backend.onrender.com';
          const cleanBaseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
          
          try {
            const theoryResponse = await fetch(`${cleanBaseUrl}/api/v1/attempts/${attemptId}/theory-submissions`);
            if (theoryResponse.ok) {
              theoryData = await theoryResponse.json();
              addLog(`Proxy Sync: ${theoryData?.length || 0} Theory Rows Verified`);
            } else {
              addLog(`Proxy Sync failed with status: ${theoryResponse.status}`);
            }
          } catch (proxyErr: any) {
            addLog(`Proxy Sync connection failed: ${proxyErr.message}`);
          }
        }

        if (theoryData && theoryData.length > 0) {
            const sortedTheory = [...theoryData].sort((a, b) => {
               const nA = parseInt(a.question_number || a.feedback || "0") || 0;
               const nB = parseInt(b.question_number || b.feedback || "0") || 0;
               return nA - nB;
            });
            setTheorySubmissions(sortedTheory);
            if (!selectedTheoryId || !sortedTheory.find(s => s.id === selectedTheoryId)) {
                setSelectedTheoryId(sortedTheory[0].id);
            }
        } else {
            setTheorySubmissions([]);
        }

        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', attData.exam_id)
          .eq('is_mcq', true);
        
        if (qData) {
          const sorted = qData.sort((a, b) => parseInt(a.question_number) - parseInt(b.question_number));
          setMcqQuestions(sorted);
          if (sorted.length > 0 && !selectedMcqId) setSelectedMcqId(sorted[0].id);
        }

        const { data: tqData } = await supabase
          .from('questions')
          .select('question_number, marking_scheme')
          .eq('exam_id', attData.exam_id)
          .eq('is_mcq', false);
        if (tqData) setTheoryQuestions(tqData);

        const { data: respData } = await supabase
          .from('exam_responses')
          .select('*')
          .eq('attempt_id', attemptId);
        if (respData) setResponses(respData);

        if (!syncTriggered.current && attData.status !== 'graded' && respData && respData.length > 0) {
           syncTriggered.current = true;
           handleRegradeMcq();
        }
      }
    } catch (err: any) {
      addLog(`CRITICAL FETCH ERROR: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRegradeMcq = async () => {
    try {
      if (!attemptId) return;
      setGradingMcq(true);
      const backendUrl = 'https://acewassce-backend.onrender.com';
      const cleanBaseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
      const endpoint = `${cleanBaseUrl}/api/v1/attempts/${attemptId}/grade-mcq`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const { data: reData } = await supabase.from('exam_attempts').select('*, exams(*)').eq('id', attemptId).single();
        if (reData) setAttempt(reData);
      }
    } catch (err: any) {
      addLog(`Auto-Sync Error: ${err.message}`);
    } finally {
      setGradingMcq(false);
    }
  };

  const handleRegradeTheory = async () => {
      try {
          setRefreshing(true);
          addLog("Re-triggering Theory Grader...");
          const backendUrl = 'https://acewassce-backend.onrender.com';
          const cleanBaseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
          const endpoint = `${cleanBaseUrl}/api/v1/attempts/${attemptId}/grade`;
          
          const response = await fetch(endpoint, { method: 'POST' });
          if (response.ok) {
              addLog("Theory Grader initiated. Waiting 8 seconds for AI reasoning...");
              // Poll twice
              setTimeout(() => fetchResults(true), 4000);
              setTimeout(() => fetchResults(true), 8000);
          } else {
              addLog("Theory Grader failed to start.");
          }
      } catch (err: any) {
          addLog(`Theory Grade Error: ${err.message}`);
      } finally {
          setRefreshing(false);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] p-6 space-y-8 animate-pulse">
        <Skeleton variant="rectangle" className="h-16 w-full rounded-2xl bg-white/5" />
        <Skeleton variant="rectangle" className="h-64 w-full rounded-3xl bg-white/5" />
      </div>
    );
  }

  const gradeInfo = getWassceGrade(attempt?.total_score || 0);

  const getCorrectOptionText = (marking: string, options: any[]) => {
    if (!marking || !options) return null;
    
    const trimmed = marking.trim().toUpperCase();
    let correctOptLetter = "";
    
    if (["A", "B", "C", "D"].includes(trimmed)) {
      correctOptLetter = trimmed;
    } else {
      // 1. Match "Correct Option: X"
      const matchCo = marking.match(/Correct\s+Option:\s*([A-D])/i);
      if (matchCo) {
        correctOptLetter = matchCo[1].toUpperCase();
      } else {
        // 2. Match "Equation: X ="
        const matchEq = marking.match(/Equation:\s*([A-D])\s*=/i);
        if (matchEq) {
          correctOptLetter = matchEq[1].toUpperCase();
        } else {
          // 3. Fallback: find any letter A, B, C, D in the first 20 characters
          const matchFirst = marking.slice(0, 20).match(/\b([A-D])\b/i);
          if (matchFirst) {
            correctOptLetter = matchFirst[1].toUpperCase();
          }
        }
      }
    }
    
    if (correctOptLetter) {
      const found = options.find(o => o.id === correctOptLetter);
      if (found) return found.text;
    }

    const clean = (t: string) => String(t).replace(/[^a-z0-9.]/gi, '').toLowerCase();
    const markingClean = clean(marking);
    for (const opt of options) {
        if (clean(opt.text) === markingClean && markingClean !== '') return opt.text;
    }
    for (const opt of options) {
        if (markingClean.includes(clean(opt.text)) && clean(opt.text).length > 1) return opt.text;
    }
    return null;
  };

  const getExplanation = (marking: string) => {
    if (!marking) return null;
    const parts = marking.split(/Explanation:\s*/i);
    return parts.length > 1 ? parts[1].trim() : null;
  };

  const selectedQ = mcqQuestions.find(q => q.id === selectedMcqId);
  const selectedResp = responses.find(r => r.question_id === selectedMcqId);
  const correctText = selectedQ ? getCorrectOptionText(selectedQ.marking_scheme, selectedQ.options || []) : null;
  
  const cleanStr = (s: string) => String(s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const isSelectedCorrect = selectedResp && correctText && (cleanStr(selectedResp.selected_option) === cleanStr(correctText));
  
  const currentMcqIdx = mcqQuestions.findIndex(q => q.id === selectedMcqId);

  const selectedTheory = theorySubmissions.find(s => s.id === selectedTheoryId);
  const currentTheoryIdx = theorySubmissions.findIndex(s => s.id === selectedTheoryId);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-inter selection:bg-primary/30 pb-20">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#020617]/70 border-b border-white/5">
        <div className="container max-w-4xl h-16 flex items-center justify-between px-4 mx-auto">
          <button onClick={() => navigate((location.state as any)?.from || "/dashboard")} className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-all">
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-all"><ArrowLeft className="h-4 w-4" /></div>
            <span className="hidden sm:inline">{(location.state as any)?.from === '/history' ? 'Back to History' : 'Dashboard'}</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="flex items-center gap-2">
            {gradingMcq && <Activity className="h-3 w-3 text-primary animate-pulse" />}
            <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] font-black text-slate-500 flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 transition-all active:scale-95">
               <Terminal className="h-3 w-3" /> <span className="hidden sm:inline">System Log</span>
            </button>
          </div>
        </div>
      </header>

      {showDebug && (
        <div className="bg-black/90 backdrop-blur-md border-b border-white/10 p-6 font-mono text-[10px] text-emerald-400 overflow-y-auto max-h-60 animate-in slide-in-from-top-4 duration-300 shadow-2xl relative z-[100]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-bold uppercase tracking-widest">Diagnostic Console</span>
              <div className="flex gap-2">
                <Button onClick={handleRegradeMcq} disabled={gradingMcq} className="h-6 px-3 bg-primary/20 text-primary text-[10px] rounded-md hover:bg-primary/30">
                  {gradingMcq ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                  Regrade MCQ
                </Button>
                <Button onClick={() => setDebugLog([])} className="h-6 px-3 bg-white/5 text-[10px] rounded-md">Clear</Button>
              </div>
            </div>
           {debugLog.map((log, i) => <div key={i} className="mb-1 border-l border-white/10 pl-2">{log}</div>)}
        </div>
      )}

      <main className="relative z-10 container max-w-4xl px-4 pt-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mb-10 w-full sm:w-fit mx-auto sm:mx-0 overflow-x-auto no-scrollbar">
          {(['overview', 'mcq', 'theory'] as const).map((t) => (
            <button key={t} onClick={() => setView(t)} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${view === t ? 'bg-primary text-white shadow-lg' : 'text-slate-500'}`}>{t}</button>
          ))}
        </div>

        {view === 'overview' && (() => {
          const mcqScore = attempt?.mcq_score || 0;
          const theoryScore = attempt?.theory_score || 0;
          const totalScore = attempt?.total_score || 0;
          const mcqPct = Math.round((mcqScore / 50) * 100);
          const theoryPct = theoryScore;
          const mcqCorrect = mcqQuestions.filter(q => {
            const resp = responses.find(r => r.question_id === q.id);
            const ct = getCorrectOptionText(q.marking_scheme, q.options || []);
            return resp && ct && resp.selected_option === ct;
          }).length;

          const gradeSteps = [
            { label: 'A1', min: 75, color: 'bg-emerald-500' },
            { label: 'B2', min: 70, color: 'bg-emerald-400' },
            { label: 'B3', min: 65, color: 'bg-teal-400' },
            { label: 'C4', min: 60, color: 'bg-blue-400' },
            { label: 'C5', min: 55, color: 'bg-amber-400' },
            { label: 'C6', min: 50, color: 'bg-amber-500' },
            { label: 'D7', min: 45, color: 'bg-orange-500' },
            { label: 'E8', min: 40, color: 'bg-rose-400' },
            { label: 'F9', min: 0, color: 'bg-red-600' },
          ];

          return (
          <div className="space-y-5 animate-in fade-in duration-500">

            {/* ── Hero Grade Card ── */}
            <div className="relative rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl bg-[#030712]/60 backdrop-blur-xl">
              {/* Ambient glow */}
              <div className={`absolute inset-0 bg-gradient-to-br opacity-20 ${gradeInfo.bg}`} />
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10 bg-primary" />

              <div className="relative z-10 p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8">
                {/* Grade ring */}
                <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r="62" className="fill-none stroke-white/5" strokeWidth="8" />
                    <circle
                      cx="72" cy="72" r="62"
                      className="fill-none stroke-primary transition-all duration-1000"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={389}
                      strokeDashoffset={389 - (389 * totalScore) / 100}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className={`text-4xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{gradeInfo.label}</span>
                  </div>
                </div>

                {/* Score info */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{exam?.subject} · {exam?.year}</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
                    {totalScore >= 75 ? 'Outstanding Result!' : totalScore >= 60 ? 'Solid Performance.' : totalScore >= 50 ? 'Credit Achieved.' : 'Keep Pushing.'}
                  </h2>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-5">
                    <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border ${gradeInfo.bg} ${gradeInfo.border} ${gradeInfo.color}`}>
                      {totalScore}% Overall
                    </span>
                    <span className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-400">
                      WAEC {gradeInfo.grade} — {gradeInfo.label}
                    </span>
                  </div>

                  {/* Segmented progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-white/5 gap-0.5">
                      <div
                        className="h-full bg-emerald-500 rounded-l-full transition-all duration-1000"
                        style={{ width: `${(mcqScore / 100) * 100}%` }}
                      />
                      <div
                        className="h-full bg-purple-500 rounded-r-full transition-all duration-1000"
                        style={{ width: `${(theoryScore / 100) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
                      <span className="text-emerald-500">MCQ {mcqScore}pts</span>
                      <span className="text-purple-500">Theory {theoryScore}pts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stat Tiles ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* MCQ tile */}
              <div className="relative group rounded-3xl bg-white/[0.03] border border-white/10 p-5 sm:p-7 hover:bg-white/[0.05] transition-all overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.06] group-hover:opacity-10 transition-opacity">
                  <Target className="h-14 w-14 text-emerald-400" />
                </div>
                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Objectives</span>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-4xl font-black text-white">{mcqCorrect}</span>
                  <span className="text-xs font-bold text-slate-500">/ 50</span>
                </div>
                <p className="text-[10px] font-bold text-emerald-400 mb-3">{mcqPct}% accuracy</p>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${mcqPct}%` }} />
                </div>
              </div>

              {/* Theory tile */}
              <div className="relative group rounded-3xl bg-white/[0.03] border border-white/10 p-5 sm:p-7 hover:bg-white/[0.05] transition-all overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.06] group-hover:opacity-10 transition-opacity">
                  <Brain className="h-14 w-14 text-purple-400" />
                </div>
                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Theory</span>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-4xl font-black text-white">{theoryScore}</span>
                  <span className="text-xs font-bold text-slate-500">/ 100</span>
                </div>
                <p className="text-[10px] font-bold text-purple-400 mb-3">{theoryPct}% of theory</p>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: `${theoryPct}%` }} />
                </div>
              </div>
            </div>

            {/* ── WAEC Grade Scale ── */}
            <div className="rounded-3xl bg-white/[0.02] border border-white/8 p-5 sm:p-6">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">WAEC Grade Scale — Your Position</p>
              <div className="flex gap-1 items-end h-10">
                {gradeSteps.map((step, i) => {
                  const isActive = gradeInfo.grade === step.label;
                  return (
                    <div key={step.label} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-sm transition-all duration-500 ${step.color} ${isActive ? 'opacity-100 ring-2 ring-white/40 ring-offset-1 ring-offset-[#020617]' : 'opacity-20'}`}
                        style={{ height: isActive ? '32px' : `${18 - i}px` }}
                      />
                      <span className={`text-[8px] font-black ${isActive ? 'text-white' : 'text-slate-700'}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Section CTA Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setView('mcq')}
                className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] active:scale-[0.98] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-base font-black text-white leading-tight">Review MCQs</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{mcqCorrect} / 50 Correct</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button
                onClick={() => setView('theory')}
                className="p-6 rounded-3xl bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/10 active:scale-[0.98] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors shrink-0">
                    <Cpu className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-base font-black text-white leading-tight">Theory Breakdown</h4>
                    <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">AI Forensic Map</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-purple-400 transition-colors shrink-0" />
              </button>
            </div>

          </div>
          );
        })()}



        {view === 'mcq' && (() => {
          const totalCorrect = mcqQuestions.filter(q => {
            const resp = responses.find(r => r.question_id === q.id);
            const ct = getCorrectOptionText(q.marking_scheme, q.options || []);
            return resp && ct && resp.selected_option === ct;
          }).length;
          const totalAnswered = responses.length;

          return (
          <div className="animate-in fade-in duration-500">

            {/* ── Stats Bar ── */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] font-black text-emerald-400">{totalCorrect} correct</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-[11px] font-black text-rose-400">{totalAnswered - totalCorrect} wrong</span>
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {currentMcqIdx + 1} / {mcqQuestions.length}
              </span>
            </div>

            {/* ── Question Navigator Rail ── */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 no-scrollbar snap-x">
              {mcqQuestions.map((q) => {
                const resp = responses.find(r => r.question_id === q.id);
                const ct = getCorrectOptionText(q.marking_scheme, q.options || []);
                const isCorrect = resp && ct && resp.selected_option === ct;
                const isSelected = selectedMcqId === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => { setSelectedMcqId(q.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`
                      flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center font-black text-[11px] transition-all snap-start
                      ${isSelected
                        ? !resp ? 'bg-slate-500/30 border-2 border-slate-400 text-white'
                          : isCorrect ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300'
                          : 'bg-rose-500/30 border-2 border-rose-400 text-rose-300'
                        : !resp ? 'bg-white/5 text-slate-600 border border-white/5'
                          : isCorrect ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }
                    `}
                  >
                    {q.question_number}
                  </button>
                );
              })}
            </div>

            {/* ── Question Card ── */}
            {selectedQ ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary text-sm">
                      {selectedQ.question_number}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Forensic Analysis</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isSelectedCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {isSelectedCorrect ? '✓ Correct' : '✗ Wrong'}
                  </div>
                </div>

                {/* Question Text */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10">
                  <div className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                    <LatexRenderer text={selectedQ.question_text} />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {(selectedQ.options || []).map((opt: any) => {
                    const isThisCorrect = correctText && opt.text === correctText;
                    const wasThisPicked = selectedResp && opt.text === selectedResp.selected_option;
                    const isWrongPick = wasThisPicked && !isThisCorrect;
                    return (
                      <div
                        key={opt.id}
                        className={`
                          flex items-center gap-4 p-4 sm:p-5 rounded-2xl border transition-all
                          ${isThisCorrect ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                            : isWrongPick ? 'bg-rose-500/10 border-rose-500/30'
                            : 'bg-white/[0.02] border-white/5 opacity-40'}
                        `}
                      >
                        {/* Option letter badge */}
                        <div className={`flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm ${isThisCorrect ? 'bg-emerald-500 text-white' : isWrongPick ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                          {opt.id}
                        </div>
                        {/* Option text */}
                        <div className="flex-1 text-sm sm:text-base font-semibold text-slate-200 leading-snug">
                          <LatexRenderer text={opt.text} />
                        </div>
                        {/* Status icon */}
                        {isThisCorrect && <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-emerald-400" />}
                        {isWrongPick && <XCircle className="flex-shrink-0 h-5 w-5 text-rose-400" />}
                      </div>
                    );
                  })}
                </div>

                {/* Answer comparison (only when wrong) */}
                {!isSelectedCorrect && selectedResp && correctText && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/15">
                      <span className="block text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">You picked</span>
                      <div className="text-sm font-bold text-rose-200 leading-snug">
                        <LatexRenderer text={selectedResp.selected_option || '–'} />
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                      <span className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Correct answer</span>
                      <div className="text-sm font-bold text-emerald-200 leading-snug">
                        <LatexRenderer text={correctText} />
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Explanation Card */}
                {selectedQ.marking_scheme && (
                  <div className="p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-xl shadow-primary/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                      <Sparkles className="h-20 w-20 text-primary" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        </div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Forensic Logic & Explanation</span>
                      </div>
                      <div className="text-sm sm:text-base font-medium text-slate-300 leading-relaxed space-y-4">
                        <LatexRenderer text={getExplanation(selectedQ.marking_scheme) || selectedQ.marking_scheme} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    disabled={currentMcqIdx === 0}
                    onClick={() => { setSelectedMcqId(mcqQuestions[currentMcqIdx - 1].id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-20 flex-1 transition-all flex items-center justify-center font-bold gap-2"
                  >
                    <ChevronLeft className="h-5 w-5" /> Prev
                  </button>
                  <div className="flex flex-col items-center px-4">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Q</span>
                    <span className="text-lg font-black text-white">{currentMcqIdx + 1}</span>
                  </div>
                  <button
                    disabled={currentMcqIdx === mcqQuestions.length - 1}
                    onClick={() => { setSelectedMcqId(mcqQuestions[currentMcqIdx + 1].id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="h-14 px-6 rounded-2xl bg-primary text-white hover:bg-primary/90 disabled:opacity-20 flex-1 shadow-lg shadow-primary/20 transition-all flex items-center justify-center font-bold gap-2"
                  >
                    Next <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center opacity-40">
                <Search className="h-16 w-16 mx-auto mb-6" />
                <p className="text-xl font-black uppercase tracking-widest">No Objectives Recorded</p>
              </div>
            )}
          </div>
          );
        })()}



        {view === 'theory' && (() => {
          const parseFeedbackLines = (feedback: string) => {
            if (!feedback) return [];
            
            // The AI often returns all marks in a single line. 
            // We insert newlines before any mark annotation like +M1, -A1, +B1 so they render on separate lines.
            const normalizedFeedback = feedback.replace(/\s+(?=[+-][MAB]\d*)/g, '\n');
            
            return normalizedFeedback.split('\n').filter(l => l.trim()).map(line => {
              const trimmed = line.trim();
              const isPositive = trimmed.startsWith('+');
              const isNegative = trimmed.startsWith('-');
              let markType = '';
              let text = trimmed;
              const markMatch = trimmed.match(/^[+-](M\d+|A\d+|B\d+):?\s*/);
              if (markMatch) {
                markType = markMatch[1];
                text = trimmed.slice(markMatch[0].length);
              } else if (isPositive || isNegative) {
                text = trimmed.slice(1).trim();
              }
              return { isPositive, isNegative, markType, text, raw: trimmed };
            });
          };

          const feedbackLines = selectedTheory ? parseFeedbackLines(selectedTheory.feedback || '') : [];
          
          const matchedQ = theoryQuestions.find(q => String(q.question_number) === String(selectedTheory?.question_number));
          let maxMarks = 10; // Default fallback
          if (matchedQ?.marking_scheme) {
            const matches = [...matchedQ.marking_scheme.matchAll(/(?:Marks:|TOTAL MARKS:)\s*(\d+)/gi)];
            if (matches.length > 0) {
              maxMarks = matches.reduce((sum: number, m: any) => sum + parseInt(m[1]), 0);
            }
          }
          
          const actualEarned = selectedTheory?.marks_attained || 0;
          const actualLost = Math.max(0, maxMarks - actualEarned);

          return (
          <div className="animate-in fade-in duration-500">

            {/* ── Top Action Bar ── */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchResults(true)}
                  disabled={refreshing}
                  className="h-9 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all disabled:opacity-40"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync</span>
                </button>
              </div>
              {theorySubmissions.length > 0 && (
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {currentTheoryIdx + 1} / {theorySubmissions.length}
                </span>
              )}
            </div>

            {/* ── Question Navigator Rail ── */}
            {theorySubmissions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar snap-x">
                {theorySubmissions.map((sub, idx) => {
                  const score = sub.marks_attained || 0;
                  const isSelected = selectedTheoryId === sub.id;
                  const isPassing = score >= 5;
                  return (
                      <button
                        key={sub.id}
                        onClick={() => { setSelectedTheoryId(sub.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        snap-start="true"
                        className={`
                          flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border transition-all
                          ${isSelected
                            ? isPassing
                              ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                              : 'bg-rose-500/20 border-rose-500/50 shadow-lg shadow-rose-500/10'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                          }
                        `}
                      >
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? (isPassing ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
                        Q{sub.question_number || idx + 1}
                      </span>
                      <span className={`text-sm font-black ${isSelected ? (isPassing ? 'text-emerald-300' : 'text-rose-300') : 'text-slate-400'}`}>
                        {score}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Main Content ── */}
            {selectedTheory ? (
              <div className="space-y-6">

                {/* Desktop: side-by-side | Mobile: stacked */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                  {/* Left: Student's Handwriting Image */}
                  <div className="lg:sticky lg:top-20 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Eye className="h-3 w-3 text-purple-400" />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Student's Workings</span>
                    </div>
                    <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/30 shadow-2xl">
                      <img
                        src={selectedTheory.image_url}
                        alt="Student submission scan"
                        className="w-full h-auto object-contain max-h-[70vh] filter brightness-110 contrast-[1.05]"
                      />
                    </div>
                  </div>

                  {/* Right: AI Analysis Panel */}
                  <div className="space-y-4">

                    {/* Score Ring Card */}
                    <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 flex items-center gap-6">
                      {/* Mini arc score */}
                      <div className="relative h-20 w-20 shrink-0">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" className="fill-none stroke-white/5" strokeWidth="6" />
                          <circle
                            cx="40" cy="40" r="32"
                            className={`fill-none transition-all duration-1000 ${actualEarned >= (maxMarks / 2) ? 'stroke-emerald-500' : 'stroke-rose-500'}`}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={201}
                            strokeDashoffset={201 - (201 * Math.min(actualEarned / maxMarks, 1))}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-xl font-black ${actualEarned >= (maxMarks / 2) ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {actualEarned}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                          Question {selectedTheory.question_number || '–'} Score
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-3xl font-black ${actualEarned >= (maxMarks / 2) ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {actualEarned}
                          </span>
                          <span className="text-slate-500 font-bold text-sm">/ {maxMarks} marks</span>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> {actualEarned} earned
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-black text-rose-400">
                            <XCircle className="h-3 w-3" /> {actualLost} lost
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI Mark Breakdown */}
                    <div className="rounded-3xl bg-[#0a0f1e] border border-purple-500/10 overflow-hidden">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                        <div className="h-7 w-7 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <Brain className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">AI Mark-by-Mark Breakdown</span>
                      </div>

                      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                        {feedbackLines.length > 0 ? feedbackLines.map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 p-3 rounded-2xl transition-all ${
                              item.isPositive
                                ? 'bg-emerald-500/5 border border-emerald-500/10'
                                : item.isNegative
                                  ? 'bg-rose-500/5 border border-rose-500/10'
                                  : 'bg-white/[0.02] border border-white/5'
                            }`}
                          >
                            {/* Mark badge */}
                            {item.markType ? (
                              <span className={`flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-lg ${
                                item.isPositive
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                              }`}>
                                {item.isPositive ? '+' : '-'}{item.markType}
                              </span>
                            ) : (
                              <span className={`flex-shrink-0 mt-0.5 h-4 w-4 rounded-full flex items-center justify-center ${
                                item.isPositive ? 'bg-emerald-500/20' : item.isNegative ? 'bg-rose-500/20' : 'bg-white/5'
                              }`}>
                                {item.isPositive
                                  ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                  : item.isNegative
                                    ? <XCircle className="h-3 w-3 text-rose-400" />
                                    : <Info className="h-3 w-3 text-slate-500" />
                                }
                              </span>
                            )}
                            <div className={`text-sm leading-relaxed font-medium ${
                              item.isPositive ? 'text-emerald-200' : item.isNegative ? 'text-rose-200' : 'text-slate-400'
                            }`}>
                              <LatexRenderer text={item.text} />
                            </div>
                          </div>
                        )) : (
                          <div className="py-8 text-center">
                            <Sparkles className="h-8 w-8 text-slate-600 mx-auto mb-3 animate-pulse" />
                            <p className="text-sm text-slate-500 font-medium">AI analysis is being processed...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Navigation Bar ── */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    disabled={currentTheoryIdx <= 0}
                    onClick={() => { setSelectedTheoryId(theorySubmissions[currentTheoryIdx - 1].id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-20 flex-1 transition-all flex items-center justify-center font-bold gap-2"
                  >
                    <ChevronLeft className="h-5 w-5" /> Prev
                  </button>
                  <div className="flex flex-col items-center px-4">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Q</span>
                    <span className="text-lg font-black text-white">{currentTheoryIdx + 1}</span>
                  </div>
                  <button
                    disabled={currentTheoryIdx >= theorySubmissions.length - 1}
                    onClick={() => { setSelectedTheoryId(theorySubmissions[currentTheoryIdx + 1].id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="h-14 px-6 rounded-2xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-20 flex-1 shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center font-bold gap-2"
                  >
                    Next <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center">
                <div className="h-20 w-20 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                  <Layers className={`h-10 w-10 text-slate-500 ${refreshing ? 'animate-spin' : 'animate-pulse'}`} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">{refreshing ? 'Refetching...' : 'No Workings Found'}</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">
                  {refreshing ? 'Checking the forensic database...' : "Either theory images haven't been uploaded yet, or the AI scan is still processing."}
                </p>
                {!refreshing && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => fetchResults(true)} className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black hover:bg-white/10 transition-all">Manual Refresh</button>
                    <button onClick={handleRegradeTheory} className="h-14 px-8 rounded-2xl bg-purple-600 text-white font-black shadow-lg shadow-purple-500/20 hover:bg-purple-500 transition-all flex items-center gap-2 justify-center"><Zap className="h-4 w-4" /> Trigger AI Scan</button>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}

      </main>
    </div>
  );
};

export default ExamResults;
