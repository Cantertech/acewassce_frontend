import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, User, BookOpen, Clock, Settings, X, Calendar, Sparkles } from "lucide-react";
import Skeleton from "@/components/Skeleton";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

// Map colors/icons to standard subjects available
const SUBJECT_COLORS: Record<string, string> = {
  "Core Mathematics": "text-blue-400 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 shadow-glow",
  "English": "text-purple-400 border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20",
  "Science": "text-emerald-400 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20",
  "Social": "text-amber-400 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20",
  "default": "text-white border-white/50 bg-white/10 hover:bg-white/20"
};

const Practice = () => {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExams() {
      const { data, error } = await supabase.from('exams').select('id, title, subject, year');
      if (data) {
        setAvailableExams(data);
      }
      setIsLoading(false);
    }
    fetchExams();
  }, []);

  // Group exams by subject
  const subjectsSet = Array.from(new Set(availableExams.map(ex => ex.subject)));
  const parsedSubjects = subjectsSet.map(subName => {
    const examsForSub = availableExams.filter(e => e.subject === subName);
    const yearsForSub = Array.from(new Set(examsForSub.map(e => e.year))).sort((a,b) => b - a);
    return {
      id: subName,
      name: subName,
      desc: `${yearsForSub.length} year(s) available`,
      color: SUBJECT_COLORS[subName] || SUBJECT_COLORS.default,
      years: yearsForSub
    }
  });

  const activeSubMeta = parsedSubjects.find(s => s.id === selectedSubject);

  const startExam = (examId: string) => {
    navigate("/instructions", { state: { examId } });
    setSelectedSubject(null);
  };



  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden pb-32">
      {/* ── BACKGROUND MESH ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      {/* ── TOP NAVBAR ── */}
      <header className="relative z-10 container flex h-16 items-center justify-between px-5 pt-2">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero text-white shadow-soft group-hover:scale-110 transition-transform">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-base font-extrabold tracking-tight text-foreground">
              A1 <span className="gradient-text">Preps</span>
            </span>
            <span className="text-[7px] font-black tracking-widest uppercase text-muted-foreground/70 -mt-0.5">
              Powered by Sixzones
            </span>
          </div>
        </Link>
        <button
          aria-label="Profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
        >
          <User className="h-4 w-4" />
        </button>
      </header>

      <main className="relative z-10 container px-4 sm:px-6 max-w-2xl mx-auto mt-6 animate-fade-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 p-2.5 mb-4 text-primary shadow-soft">
            <Settings className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Select Subject
          </h1>
          <p className="mt-2 text-sm text-muted-foreground w-3/4 mx-auto">
            Choose the specific subject you want to practice. You'll select the exam year next.
          </p>
        </div>

        {/* SUBJECT GRID */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center justify-center p-8 rounded-[2rem] border border-white/5 bg-white/5 space-y-4">
                <Skeleton variant="rectangle" className="h-16 w-16 !rounded-2xl" />
                <Skeleton variant="text" className="h-6 w-3/4 mx-auto" />
                <Skeleton variant="text" className="h-4 w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : parsedSubjects.length === 0 ? (
          <div className="text-center text-muted-foreground p-8 border border-white/5 rounded-3xl bg-white/5">
            No subjects properly parsed and loaded in the database yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parsedSubjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                className="glass-card-hover group flex flex-col items-center justify-center text-center rounded-[2rem] border border-white/10 p-8 transition-all hover:bg-white/5"
              >
                <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border transition-transform group-hover:scale-110 ${sub.color}`}>
                  <BookOpen className="h-7 w-7" />
                </div>
                <p className="font-display text-lg font-extrabold text-foreground">{sub.name}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{sub.desc}</p>
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      {/* ── EXAM YEAR SELECTION MODAL ── */}
      {selectedSubject && activeSubMeta && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-xl animate-fade-in"
            onClick={() => setSelectedSubject(null)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-card/95 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-glow animate-fade-up">
            <button 
              onClick={() => setSelectedSubject(null)}
              className="absolute right-6 top-6 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 text-muted-foreground hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="mb-6 pr-8">
              <span className={`inline-flex items-center justify-center rounded-xl p-2.5 mb-4 border ${activeSubMeta.color}`}>
                <BookOpen className="h-5 w-5" />
              </span>
              <h2 className="font-display text-2xl font-extrabold text-white">
                {activeSubMeta.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select the past paper or mode.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1 pb-4 scrollbar-hide">
              {availableExams
                .filter(ex => ex.subject === selectedSubject)
                .sort((a,b) => b.year - a.year)
                .map((ex) => {
                  return (
                    <button
                      key={ex.id}
                      onClick={() => startExam(ex.id)}
                      className={`group flex flex-col items-start w-full rounded-2xl border p-4 transition-colors text-left bg-white/5 border-white/10 hover:border-primary/50 hover:bg-primary/10`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-2 font-display text-sm font-bold text-white">
                          <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          {ex.year} WASSCE Paper
                        </span>
                      </div>
                      <p className="text-xs mt-1.5 pl-6 text-muted-foreground">{ex.title}</p>
                    </button>
                  );
                })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 90 Mins</span>
              <span>50 Objectives</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Practice;
