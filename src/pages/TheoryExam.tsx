import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, AlertTriangle, X, Camera, CheckCircle2, ChevronLeft, ChevronRight, LayoutGrid, UploadCloud, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import LatexRenderer from "@/components/LatexRenderer";
import Skeleton from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";

const TheoryExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { examId?: string, attemptId?: string } | null;
  const examId = state?.examId;
  const attemptId = state?.attemptId;

  const [questions, setQuestions] = useState<any[]>([]);
  const [examMetadata, setExamMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 'reading' -> taking the exam, 'uploading' -> snapping pictures
  const [mode, setMode] = useState<'reading' | 'uploading'>(() => {
    if (state?.attemptId) {
      const saved = localStorage.getItem(`acewassce_theory_mode_${state.attemptId}`);
      if (saved === 'reading' || saved === 'uploading') return saved;
    }
    return 'reading';
  });

  // Persist mode whenever it changes
  useEffect(() => {
    if (attemptId) {
      localStorage.setItem(`acewassce_theory_mode_${attemptId}`, mode);
    }
  }, [mode, attemptId]);
  
  // Reading mode state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);

  // Timer state 
  const [timeLeft, setTimeLeft] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showStartUploadConfirm, setShowStartUploadConfirm] = useState(false);

  // Upload state
  const [uploadQueue, setUploadQueue] = useState<{file: File, id: string, progress: number, url?: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const isFirst = currentIdx === 0;
  const isLast = currentIdx === (questions.length > 0 ? questions.length - 1 : 0);

  useEffect(() => {
    if (!examId) {
      navigate('/practice');
      return;
    }

    async function fetchData() {
      // Fetch metadata
      const { data: mData } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (mData) {
        setExamMetadata(mData);
      }

      // Fetch questions
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .eq('is_mcq', false);
        
      if (data) {
        // Smart Merge Logic: Detects if questions share numbers or look like sub-parts
        const mergeQuestions = (rawQuestions: any[]) => {
          const merged: any[] = [];
          
          rawQuestions.forEach((q) => {
            const text = q.question_text?.trim() || "";
            const qNum = parseInt(q.question_number);
            
            // 1. Check if this question number matches the previous one
            const last = merged.length > 0 ? merged[merged.length - 1] : null;
            const isSameNumber = last && parseInt(last.question_number) === qNum;
            
            // 2. Check if text starts with (a), (b), (i), etc.
            const isSubPart = /^\s*(\([a-z]\)|\([ivx]+\))/i.test(text);
            
            if ((isSameNumber || isSubPart) && last) {
              if (!last.sub_questions) last.sub_questions = [];
              
              // Only add if it's not a direct text duplicate
              const isDuplicateText = last.question_text.includes(text);
              if (!isDuplicateText) {
                last.sub_questions.push(q);
              }
            } else {
              merged.push({ ...q });
            }
          });
          
          return merged;
        };

        const sorted = data.sort((a, b) => {
          const numA = parseInt(a.question_number);
          const numB = parseInt(b.question_number);
          if (numA !== numB) return numA - numB;
          return (a.question_id || "").localeCompare(b.question_id || "");
        });
        setQuestions(mergeQuestions(sorted));
      }
      setIsLoading(false);
    }
    fetchData();
  }, [examId]);

  useEffect(() => {
    if (isLoading || !examMetadata) return;

    // PERSISTENT TIMER LOGIC
    const EXAM_KEY = `acewassce_theory_timer_${attemptId || examId}`;
    const savedEndTime = localStorage.getItem(EXAM_KEY);
    const DURATION = Number(examMetadata.theory_duration) || 9000;

    if (savedEndTime) {
      const remaining = Math.max(0, Math.floor((parseInt(savedEndTime) - Date.now()) / 1000));
      setTimeLeft(remaining);
    } else {
      const endTime = Date.now() + DURATION * 1000;
      localStorage.setItem(EXAM_KEY, endTime.toString());
      setTimeLeft(DURATION);
    }

    if (mode !== 'reading') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem(EXAM_KEY);
          alert("Time is up! Please drop your pens. Beginning the structured upload sequence.");
          setMode('uploading');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, isLoading, examMetadata]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleEndReading = () => {
    console.log("Ending reading mode, opening upload confirmation...");
    setShowStartUploadConfirm(true);
  };

  // Tagging state
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState("");

  const handleCaptureImage = () => {
    if (!attemptId) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      // Show tagging modal instead of immediate upload
      setCurrentFile(file);
      setTagInput("");
      setShowTagModal(true);
    };

    input.click();
  };

  const handleConfirmTag = () => {
    if (!currentFile || !tagInput.trim()) {
      alert("Please enter the question numbers present on this page.");
      return;
    }

    const newId = Math.random().toString(36).substr(2, 9);
    setUploadQueue(prev => [...prev, { file: currentFile, id: newId, progress: 0 }]);
    
    // Start background upload with tags
    processUpload(currentFile, newId, tagInput);
    
    setShowTagModal(false);
    setCurrentFile(null);
  };

  const processUpload = async (file: File, id: string, tags: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tags', tags); // Send manual tags to backend

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://acewassce-backend.onrender.com';
      const response = await fetch(`${backendUrl}/api/v1/attempts/${attemptId}/upload-working?is_general=true`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.status === 'success') {
        setUploadQueue(prev => prev.map(item => 
          item.id === id ? { ...item, progress: 100, url: result.image_url, tags: tags } : item
        ));
      }
    } catch (err) {
      console.error("Background upload failed:", err);
      setUploadQueue(prev => prev.filter(item => item.id !== id));
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleFinishAll = async () => {
    if (!attemptId) return;
    
    const allDone = uploadQueue.every(item => item.progress === 100);
    if (!allDone) {
      alert("Please wait for all images to finish uploading.");
      return;
    }

    setIsSubmitting(true);
    localStorage.removeItem(`acewassce_theory_timer_${examId}`);
    localStorage.removeItem(`acewassce_theory_mode_${attemptId}`);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://acewassce-backend.onrender.com';
      const response = await fetch(`${backendUrl}/api/v1/attempts/${attemptId}/grade`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error("Failed to trigger AI grading");
      navigate("/exam/theory-success", { state: { attemptId } });
    } catch (err) {
      console.error("Finalization error:", err);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-10 animate-pulse mt-12">
          <Skeleton variant="rectangle" className="h-24 w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton variant="rectangle" className="h-6 w-32 rounded-full" />
            <Skeleton variant="text" className="h-12 w-full" />
            <Skeleton variant="text" className="h-12 w-2/3" />
          </div>
          <div className="space-y-4 mt-12">
            <Skeleton variant="rectangle" className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="h-20 w-20 rounded-full border-[3px] border-white/5 border-t-emerald-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Upload className="h-7 w-7 text-emerald-500" />
          </div>
        </div>
        <h2 className="font-display text-lg font-extrabold text-white mb-1">Submitting Papers</h2>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Securing your answers on our servers...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 p-4 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-2">No Theory Questions</h2>
        <p className="text-muted-foreground mb-8">This exam entry hasn't been uploaded yet.</p>
        <button onClick={() => navigate('/practice')} className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors">
          Explore Other Subjects
        </button>
      </div>
    )
  }

  // ----------------------------------------------------
  // READING/EXAM MODE
  // ----------------------------------------------------
  if (mode === 'reading') {
    const question = questions[currentIdx];

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 overflow-x-hidden">
        {/* ── STICKY HEADER ── */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
          <div className="container max-w-3xl flex h-14 items-center justify-between px-4">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Timer pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${timeLeft < 600 ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-white'}`}>
              <Clock className="h-3 w-3" />
              <span className="text-xs font-black font-display">{formatTime(timeLeft)}</span>
            </div>

            {/* Question counter */}
            <button
              onClick={() => setShowNavigator(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <LayoutGrid className="h-3 w-3 text-primary" />
              <span className="text-white">{currentIdx + 1}</span>/{questions.length}
            </button>
          </div>
        </header>

        <main className="flex-1 container max-w-3xl px-4 py-6 animate-fade-up">
          {/* ── QUESTION NAVIGATOR RAIL ── */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-5 no-scrollbar snap-x">
            {questions.map((q, i) => {
              const isCurrent = currentIdx === i;
              const isCompulsory = parseInt(q.question_number) <= (examMetadata?.compulsory_questions || 5);
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`
                    flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center font-black text-[11px] transition-all snap-start
                    ${isCurrent
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 border-2 border-primary'
                      : isCompulsory
                        ? 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                        : 'bg-purple-500/5 text-purple-400 border border-purple-500/10 hover:bg-purple-500/10'
                    }
                  `}
                >
                  {q.question_number}
                </button>
              );
            })}
          </div>

          {/* ── INSTRUCTIONS (collapsible) ── */}
          <div className={`rounded-2xl overflow-hidden border transition-all duration-300 mb-5 ${showInstructions ? 'bg-blue-500/5 border-blue-500/10' : 'bg-white/[0.02] border-white/5'}`}>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0 h-5 w-5 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400">
                  <span className="font-black text-[8px]">i</span>
                </span>
                <p className="font-bold text-blue-400 text-[10px] uppercase tracking-widest">Instructions</p>
              </div>
              {showInstructions ? <ChevronUp className="h-3.5 w-3.5 text-blue-400" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-400" />}
            </button>
            {showInstructions && (
              <div className="px-3 pb-3">
                <p className="text-[11px] text-blue-100/60 leading-relaxed pl-7 border-l border-blue-500/15">
                  {examMetadata?.theory_instructions || "Answer all compulsory questions. Choose from the optional section as required."}
                </p>
              </div>
            )}
          </div>

          {/* ── QUESTION CONTENT ── */}
          <div className="space-y-5">
            {/* Part & Question badge */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                parseInt(question?.question_number) <= (examMetadata?.compulsory_questions || 5)
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/15'
              }`}>
                {parseInt(question?.question_number) <= (examMetadata?.compulsory_questions || 5) ? 'Compulsory' : 'Optional'}
              </span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Question {question?.question_number}
              </span>
            </div>

            {/* Diagram (if exists) */}
            {question?.image_url && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20 shadow-xl">
                <img
                  src={question.image_url}
                  alt={`Diagram for Q${question.question_number}`}
                  className="w-full h-auto object-contain max-h-[350px] mx-auto filter brightness-110"
                />
              </div>
            )}

            {/* Question text */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 sm:p-6 overflow-hidden">
              <div className="text-base sm:text-lg text-white/90 whitespace-pre-wrap leading-relaxed font-medium tracking-wide break-words overflow-x-auto">
                <LatexRenderer text={question?.question_text || ""} />
              </div>
            </div>

            {/* Sub-questions */}
            {question?.sub_questions?.length > 0 && (
              <div className="space-y-3 pl-2">
                {question.sub_questions.map((sub: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex gap-3 items-start pl-3 border-l-2 border-primary/20 overflow-hidden">
                      <div className="text-sm sm:text-base text-white/80 whitespace-pre-wrap leading-relaxed font-medium break-words flex-1 py-1 overflow-x-auto">
                        <LatexRenderer text={sub.question_text || sub.text || ""} />
                      </div>
                    </div>

                    {/* Nested sub-sub-questions */}
                    {sub.sub_questions?.length > 0 && (
                      <div className="ml-6 space-y-2">
                        {sub.sub_questions.map((subsub: any, subIdx: number) => (
                          <div key={subIdx} className="pl-3 border-l-2 border-white/5 py-1 overflow-hidden">
                            <div className="text-sm text-white/65 whitespace-pre-wrap leading-relaxed font-medium break-words overflow-x-auto">
                              <LatexRenderer text={subsub.question_text || subsub.text || ""} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* ── FIXED BOTTOM NAV ── */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-white/5 p-3">
          <div className="container max-w-3xl flex items-center gap-3">
            <button
              onClick={() => setCurrentIdx(currentIdx - 1)}
              disabled={isFirst}
              className="h-12 px-5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-20 flex items-center justify-center font-bold gap-1.5 transition-all flex-1"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>

            <div className="flex flex-col items-center px-2 shrink-0">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Q</span>
              <span className="text-base font-black text-white">{currentIdx + 1}</span>
            </div>

            {isLast ? (
              <button
                onClick={() => handleEndReading()}
                className="h-12 px-5 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 flex items-center justify-center font-bold gap-1.5 transition-all flex-1"
              >
                <UploadCloud className="h-4 w-4" /> Upload Scans
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(currentIdx + 1)}
                className="h-12 px-5 rounded-2xl bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center justify-center font-bold gap-1.5 transition-all flex-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </footer>

        {/* EXIT CONFIRMATION MODAL */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setShowExitConfirm(false)} />
            <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-elevated text-center animate-fade-up">
              <h3 className="font-display text-xl font-extrabold text-white mb-2">End Exam Early?</h3>
              <p className="text-sm text-muted-foreground mb-6">Progress will be lost.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowExitConfirm(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button variant="destructive" onClick={() => {
                  localStorage.removeItem(`acewassce_theory_timer_${examId}`);
                  localStorage.removeItem(`acewassce_theory_mode_${attemptId}`);
                  navigate("/dashboard");
                }} className="flex-1 rounded-xl">End Exam</Button>
              </div>
            </div>
          </div>
        )}

        {/* START UPLOAD CONFIRMATION MODAL */}
        {showStartUploadConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setShowStartUploadConfirm(false)} />
            <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-elevated text-center animate-fade-up">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 mb-4">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-extrabold text-white mb-2">Start Scanning?</h3>
              <p className="text-sm text-muted-foreground mb-6">Close the paper and start uploading your workings?</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowStartUploadConfirm(false)} className="flex-1 rounded-xl border-white/10">Cancel</Button>
                <Button onClick={() => { setShowStartUploadConfirm(false); setMode('uploading'); }} className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-0 shadow-glow">Continue</Button>
              </div>
            </div>
          </div>
        )}

        {/* QUESTION NAVIGATOR MODAL */}
        {showNavigator && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setShowNavigator(false)} />
            <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-elevated animate-fade-up">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-base font-extrabold text-white">Jump to Question</h3>
                <button onClick={() => setShowNavigator(false)} className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 text-slate-400 hover:text-white transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => { setCurrentIdx(i); setShowNavigator(false); }}
                    className={`h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      currentIdx === i
                        ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-card'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {q.question_number}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // BULK UPLOAD MODE
  // ----------------------------------------------------
  const totalUploaded = uploadQueue.filter(i => i.progress === 100).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 overflow-x-hidden">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="container max-w-2xl flex h-14 items-center justify-between px-4">
          <span className="font-display text-xs font-extrabold text-white uppercase tracking-widest">Upload Workings</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-black">
            <span className="text-emerald-400">{totalUploaded}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{uploadQueue.length}</span>
            <span className="text-[9px] text-slate-500 ml-0.5">synced</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl px-4 py-6 flex flex-col">
        {/* Instructions */}
        <div className="text-center mb-6">
          <h2 className="font-display text-lg font-extrabold text-white mb-1">Capture Your Pages</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Snap each page of your workings. <span className="text-primary font-bold">Write question numbers clearly</span> on top.
          </p>
        </div>

        {/* Upload Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {/* Camera trigger */}
          <button
            onClick={handleCaptureImage}
            className="aspect-[3/4] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all group"
          >
            <div className="h-10 w-10 bg-primary/15 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[9px] font-black uppercase text-primary tracking-widest">Snap Page</p>
          </button>

          {/* Queued images */}
          {uploadQueue.map((item: any, i) => (
            <div key={item.id} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] animate-fade-up">
              {item.url ? (
                <>
                  <img src={item.url} className="w-full h-full object-cover" />
                  <div className="absolute top-1.5 right-1.5 h-5 w-5 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                  {item.tags && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary/80 backdrop-blur-md rounded-md">
                      <p className="text-[7px] font-black text-white uppercase">Q{item.tags}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                  <div className="h-1 w-3/4 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse w-full" />
                  </div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Uploading...</p>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 h-7 bg-gradient-to-t from-black/70 to-transparent flex items-end px-2 pb-1">
                <span className="text-[9px] font-bold text-white/40">Page {i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── FIXED FOOTER ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-white/5 p-3">
        <div className="container max-w-2xl flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{uploadQueue.length} page{uploadQueue.length !== 1 ? 's' : ''} captured</p>
            {uploadQueue.length > 0 && (
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${uploadQueue.length > 0 ? (totalUploaded / uploadQueue.length) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
          <button
            onClick={handleFinishAll}
            disabled={uploadQueue.length === 0 || !uploadQueue.every(i => i.progress === 100)}
            className="h-12 px-6 rounded-2xl bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none shrink-0 flex items-center gap-2"
          >
            <UploadCloud className="h-4 w-4" />
            Submit
          </button>
        </div>
      </footer>

      {/* ── QUESTION TAGGING MODAL ── */}
      {showTagModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-[2.5rem] p-8 shadow-elevated animate-fade-up text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl font-extrabold text-white mb-2">Identify Questions</h3>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Which questions are on this page? 
              <br/>
              <span className="text-[10px] opacity-60">If there are multiple, separate them with commas (e.g. <span className="text-primary font-bold">2, 3, 4</span>)</span>
            </p>
            
            <div className="space-y-6">
              <div className="relative group">
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. 2, 3, 4"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-lg font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmTag()}
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-20 group-focus-within:opacity-100 transition-opacity">
                   <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => { setShowTagModal(false); setCurrentFile(null); }} 
                  className="flex-1 h-12 rounded-2xl border-white/10"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmTag}
                  className="flex-1 h-12 rounded-2xl bg-primary text-white font-bold shadow-glow"
                >
                  Save & Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TheoryExam;
