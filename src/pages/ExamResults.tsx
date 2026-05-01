import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Award, ArrowLeft, Download, Share2, Target, Brain,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Search, Sparkles, LayoutDashboard,
  FileText, XCircle, Info, ChevronRight,
  TrendingUp, Clock, BookOpen, GraduationCap,
  Eye, HelpCircle
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

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-inter selection:bg-primary/30 pb-20 overflow-x-hidden">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#020617]/70 border-b border-white/5">
        <div className="container max-w-5xl h-16 flex items-center justify-between px-4 sm:px-6">
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
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Certified Result</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 relative p-10 sm:p-14 rounded-[3.5rem] border border-white/10 overflow-hidden group shadow-2xl bg-[#030712]">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
                 <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="relative h-44 w-44 flex items-center justify-center">
                       <svg className="h-full w-full rotate-[-90deg]">
                          <circle cx="88" cy="88" r="80" className="fill-none stroke-white/5 stroke-[8]" />
                          <circle 
                            cx="88" cy="88" r="80" 
                            className="fill-none stroke-primary stroke-[10] transition-all duration-1000"
                            style={{ strokeDasharray: 502, strokeDashoffset: 502 - (502 * (attempt?.total_score || 0)) / 100 }}
                            strokeLinecap="round"
                          />
                       </svg>
                       <div className="absolute flex flex-col items-center">
                          <span className={`text-6xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{gradeInfo.label}</span>
                       </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                       <h2 className="text-4xl font-black text-white mb-2 leading-tight">Mastered Logic.</h2>
                       <p className="text-slate-400 font-medium mb-6">Your forensic breakdown for {exam?.subject} is ready. You performed exceptionally in the theory section.</p>
                       <div className="flex flex-wrap justify-center md:justify-start gap-4">
                          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-xs font-bold text-slate-200">Attempt #{attemptId?.slice(0, 4)}</div>
                          <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs font-bold text-emerald-400 uppercase tracking-widest">{attempt?.total_score || 0}% Final</div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all group">
                    <Brain className="h-6 w-6 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Theory Score</span>
                    <span className="text-3xl font-black text-white">{attempt?.theory_score || 0}<span className="text-sm text-slate-500 font-bold">/100</span></span>
                 </div>
                 <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all group">
                    <Target className="h-6 w-6 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">MCQ Score</span>
                    <span className="text-3xl font-black text-white">{attempt?.mcq_score || 0}<span className="text-sm text-slate-500 font-bold">/50</span></span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
               <Button onClick={() => setView('mcq')} className="h-24 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 group px-10 justify-between">
                  <div className="flex flex-col items-start text-left">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section A Review</span>
                     <span className="text-lg font-black text-slate-200">Explore Objective Errors</span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                     <ChevronRight className="h-5 w-5" />
                  </div>
               </Button>
               <Button onClick={() => setView('theory')} className="h-24 rounded-3xl bg-primary/10 border border-primary/20 hover:bg-primary/20 group px-10 justify-between">
                  <div className="flex flex-col items-start text-left">
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">Section B Review</span>
                     <span className="text-lg font-black text-slate-200">Theory Forensic Mapping</span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/40 transition-all">
                     <ChevronRight className="h-5 w-5" />
                  </div>
               </Button>
            </div>
          </div>
        )}

        {/* ── VIEW 2: MCQ GRID REVIEW ── */}
        {view === 'mcq' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="text-center mb-12">
                <h3 className="text-3xl font-black text-white mb-2">Objective Grid Review</h3>
                <p className="text-slate-400 font-medium max-w-lg mx-auto">Click any question number to reveal the full forensic breakdown and logic path.</p>
             </div>

             {/* MCQ NUMBER GRID */}
             <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 max-w-2xl mx-auto">
                {mcqQuestions.map((q) => {
                  const resp = responses.find(r => r.question_id === q.id);
                  const correct = getCorrectOption(q.marking_scheme, q.options || []);
                  const isCorrect = resp?.selected_option === correct;
                  const hasAnswered = !!resp;
                  const isSelected = selectedMcqId === q.id;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelectedMcqId(q.id)}
                      className={`h-12 w-full rounded-xl border flex items-center justify-center font-black text-sm transition-all relative ${
                        isSelected ? 'ring-2 ring-primary ring-offset-4 ring-offset-[#020617] scale-110 z-10' : ''
                      } ${
                        !hasAnswered ? 'bg-white/5 border-white/5 text-slate-600' :
                        isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {q.question_number}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-ping" />
                      )}
                    </button>
                  );
                })}
             </div>

             {/* DETAIL CARD */}
             {selectedQ && (
               <div className="mt-16 animate-in slide-in-from-top-4 duration-500 max-w-3xl mx-auto">
                  <div className="p-8 sm:p-12 rounded-[3.5rem] bg-white/[0.03] border border-white/10 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-5">
                        <HelpCircle className="h-32 w-32" />
                     </div>
                     
                     <div className="flex items-center gap-4 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary">Q{selectedQ.question_number}</div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Forensic Question Analysis</h4>
                     </div>

                     <div className="text-xl sm:text-2xl font-bold text-white leading-relaxed mb-10">
                        <LatexRenderer text={selectedQ.question_text} />
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                        {(selectedQ.options || []).map((opt: any) => (
                           <div 
                             key={opt.id}
                             className={`p-6 rounded-2xl border flex items-center gap-5 transition-all ${
                               opt.id === selectedCorrect 
                               ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20' 
                               : opt.id === selectedResp?.selected_option && selectedResp?.selected_option !== selectedCorrect
                               ? 'bg-rose-500/10 border-rose-500/30'
                               : 'bg-white/5 border-white/5 opacity-60'
                             }`}
                           >
                              <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm ${
                                 opt.id === selectedCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'
                              }`}>
                                 {opt.id}
                              </div>
                              <div className="text-base font-medium text-slate-200">
                                 <LatexRenderer text={opt.text} />
                              </div>
                              {opt.id === selectedCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-auto" />}
                              {opt.id === selectedResp?.selected_option && selectedResp?.selected_option !== selectedCorrect && <XCircle className="h-5 w-5 text-rose-400 ml-auto" />}
                           </div>
                        ))}
                     </div>

                     <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-2 mb-4 text-slate-500">
                           <Info className="h-4 w-4" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Official Marking Logic</span>
                        </div>
                        <div className="text-slate-300 italic text-sm leading-relaxed">
                           <LatexRenderer text={selectedQ.marking_scheme || "Calculating forensic path..."} />
                        </div>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* ── VIEW 3: THEORY REVIEW ── */}
        {view === 'theory' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-purple-500/5 rounded-[2.5rem] p-10 border border-purple-500/10 flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-3xl font-black text-white">Forensic Theory Map</h3>
                <p className="text-slate-400 font-medium">Digital scanning and AI-driven step-by-step logic verification.</p>
              </div>
              <div className="h-24 w-24 rounded-3xl bg-purple-500/20 flex flex-col items-center justify-center border border-purple-500/20 shadow-lg shadow-purple-500/10">
                <span className="text-4xl font-black text-purple-400">{attempt?.theory_score || 0}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase">/100</span>
              </div>
            </div>

            <div className="space-y-6">
              {theorySubmissions.map((sub) => (
                <div 
                  key={sub.id}
                  className={`rounded-[3rem] border transition-all duration-500 overflow-hidden ${
                    expandedTheoryId === sub.id ? 'bg-[#030712] border-white/10 shadow-2xl scale-[1.02] z-10' : 'bg-transparent border-white/5 hover:border-white/10'
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
                          <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-[#020617] border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-500">10</div>
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
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-primary/10 transition-all ${expandedTheoryId === sub.id ? 'rotate-180 bg-primary/20 text-primary' : ''}`}>
                      <ChevronDown className="h-6 w-6" />
                    </div>
                  </button>

                  {expandedTheoryId === sub.id && (
                    <div className="px-10 pb-12 pt-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="grid md:grid-cols-2 gap-12 border-t border-white/5 pt-10">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between px-2">
                             <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                               <FileText className="h-3 w-3" /> Digital Scan Evidence
                             </h5>
                             <button className="text-[10px] font-black text-primary uppercase hover:underline">Full Image</button>
                          </div>
                          <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black group cursor-zoom-in relative">
                            <img 
                              src={sub.image_url} 
                              alt="Scan" 
                              className="w-full h-auto opacity-70 group-hover:opacity-100 transition-all duration-1000 scale-[1.01] group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-8">
                           <div className="p-10 rounded-[2.5rem] bg-primary/5 border border-primary/20 relative group overflow-hidden shadow-inner">
                              <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                                <Award className="h-40 w-40 text-primary" />
                              </div>
                              <h5 className="text-[10px] font-black text-primary uppercase tracking-widest mb-8 flex items-center gap-2">
                                <Sparkles className="h-3 w-3" /> Examiner Reasonings
                              </h5>
                              <div className="text-base text-blue-50/90 leading-relaxed space-y-6 font-medium italic">
                                <LatexRenderer text={sub.feedback || "Detailed step-by-step logic analysis is being processed..."} />
                              </div>
                           </div>

                           <div className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                              <div className="flex items-center gap-3">
                                 <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                 <span className="text-xs font-bold text-slate-400">Validated by AceAI Forensic v4</span>
                              </div>
                              <div className="h-8 w-24 bg-primary/20 rounded-full flex items-center justify-center text-[10px] font-black text-primary uppercase tracking-widest">Certified</div>
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
        <section className="mt-24 p-16 rounded-[4rem] border border-white/5 bg-[#030712] text-center relative overflow-hidden group shadow-3xl">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative z-10">
            <GraduationCap className="h-14 w-14 text-primary mx-auto mb-8 group-hover:rotate-12 transition-all duration-500" />
            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Ready for the Real Challenge?</h3>
            <p className="text-slate-400 font-medium max-w-md mx-auto mb-12 text-lg">
               You are performing at the <span className={`font-black ${gradeInfo.color}`}>{gradeInfo.label}</span> level. Practicing the theory logic in Section B will ensure your A1.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                onClick={() => navigate("/dashboard")}
                className="h-16 px-12 rounded-[1.5rem] bg-white text-[#020617] hover:bg-white/90 font-black shadow-2xl transition-all active:scale-95 w-full sm:w-fit text-lg"
              >
                Start New Exam
              </Button>
              <Button 
                className="h-16 px-12 rounded-[1.5rem] bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold w-full sm:w-fit text-lg"
              >
                Forensic Report (PDF)
              </Button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default ExamResults;
