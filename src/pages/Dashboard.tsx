import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  Clock,
  TrendingUp,
  Award,
  Target,
  Home,
  BarChart3,
  History,
  User,
  Sparkles,
  Brain,
  Loader2
} from "lucide-react";
import Skeleton from "@/components/Skeleton";
import logo from "@/assets/ace_logo.png";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("Student");
  const [chartData, setChartData] = useState<any[]>([]);
  const [weaknesses, setWeaknesses] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [percentile, setPercentile] = useState(0);
  const [dailyGoalProgress, setDailyGoalProgress] = useState(0);
  const [userRank, setUserRank] = useState(0);
  const [stats, setStats] = useState([
    { label: "Mocks Taken", value: "0", icon: ClipboardList, color: "text-blue-400" },
    { label: "Average Grade", value: "-", icon: Award, color: "text-amber-400" },
    { label: "Level & Rank", value: "L1 • #0", icon: TrendingUp, color: "text-emerald-400" },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // 1. Get Student Profile
      const { data: profile } = await supabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setStudentName(profile.full_name?.split(" ")[0] || "Student");
        
        // Calculate Rank
        const { count: rankCount } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .gt("total_points", profile.total_points || 0);
          
        const currentRank = (rankCount || 0) + 1;
        const currentLevel = Math.floor((profile.total_points || 0) / 100) + 1;

        // Update stats but keep 'Days Left' hardcoded or find a way to calculate it
        setStats([
          { label: "Mocks Taken", value: "0", icon: ClipboardList, color: "text-blue-400" },
          { label: "Average Grade", value: "-", icon: Award, color: "text-amber-400" },
          { label: "Level & Rank", value: `L${currentLevel} • #${currentRank}`, icon: TrendingUp, color: "text-emerald-400" },
        ]);
        
        // Preserve other data for next steps
        (window as any)._userRank = currentRank;
      }

      // 2. Get Exam Stats & Graph Data
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("total_score, status, start_time")
        .eq("student_id", user.id)
        .order("start_time", { ascending: true });

      if (attempts) {
        const completed = attempts.filter(a => a.status === 'graded');
        const avgScore = completed.length > 0 
          ? Math.round(completed.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / completed.length)
          : 0;

        const getGrade = (s: number) => {
           if (s >= 80) return "A1";
           if (s >= 70) return "B2";
           if (s >= 60) return "B3";
           if (s >= 50) return "C4";
           return "F9";
        };

        // Format for Chart (Last 6 mocks)
        const recentAttempts = completed.slice(-6).map((a, i) => ({
          name: `Mock ${i + 1}`,
          score: a.total_score || 0
        }));
        setChartData(recentAttempts.length > 0 ? recentAttempts : [
          { name: "Start", score: 0 }
        ]);

        // Last Result for Hero Card
        if (completed.length > 0) {
          setLastResult(completed[completed.length - 1]);
        }

        const { data: profile_new } = await supabase.from("students").select("*").eq("id", user.id).maybeSingle();
        
        // Ranking Calculation
        const { count: rankCount } = await supabase.from("students").select("*", { count: "exact", head: true }).gt("total_points", profile_new?.total_points || 0);
        const { count: totalStudents } = await supabase.from("students").select("*", { count: "exact", head: true });
        
        const currentRank = (rankCount || 0) + 1;
        const currentLevel = Math.floor((profile_new?.total_points || 0) / 100) + 1;
        const calculatedPercentile = totalStudents && totalStudents > 0 ? Math.max(1, Math.round((currentRank / totalStudents) * 100)) : 100;
        
        setPercentile(calculatedPercentile);
        setUserRank(currentRank);

        // Daily Goal Logic (Goal: 2 Mocks per day)
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayMocks = attempts.filter(a => new Date(a.start_time) >= today).length;
        const goalProgress = Math.min(100, Math.round((todayMocks / 2) * 100));
        setDailyGoalProgress(goalProgress);

        setStats([
          { label: "Mocks Taken", value: attempts.length.toString(), icon: ClipboardList, color: "text-blue-400" },
          { label: "Average Grade", value: completed.length > 0 ? getGrade(avgScore) : "-", icon: Award, color: "text-amber-400" },
          { label: "Level & Rank", value: `L${currentLevel} • #${currentRank}`, icon: TrendingUp, color: "text-emerald-400" },
        ]);
      }

      // 3. Get Weaknesses from View
      const { data: topicPerformance } = await supabase
        .from("student_topic_performance")
        .select("*")
        .eq("student_id", user.id)
        .order("proficiency_index", { ascending: true })
        .limit(3);

      if (topicPerformance) {
        const colors = ["bg-rose-500", "bg-amber-500", "bg-blue-500"];
        setWeaknesses(topicPerformance.map((tp, i) => ({
          topic: tp.topic,
          progress: Math.round(tp.proficiency_index),
          color: colors[i % colors.length]
        })));
      } else {
        // Fallback placeholders if no data yet
        setWeaknesses([
          { topic: "Calculus", progress: 0, color: "bg-rose-500" },
          { topic: "Circle Theorems", progress: 0, color: "bg-amber-500" }
        ]);
      }
    } catch (error: any) {
      console.error("Dashboard error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-10 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton variant="rectangle" className="h-10 w-40" />
          <Skeleton variant="circle" className="h-10 w-10" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="text" className="h-10 w-1/2" />
          <Skeleton variant="text" className="h-4 w-3/4" />
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton variant="rectangle" className="h-[300px] w-full rounded-[2.5rem]" />
            <Skeleton variant="rectangle" className="h-[300px] w-full rounded-[2.5rem]" />
          </div>
          <div className="space-y-6">
            <Skeleton variant="rectangle" className="h-24 w-full rounded-3xl" />
            <Skeleton variant="rectangle" className="h-24 w-full rounded-3xl" />
            <Skeleton variant="rectangle" className="h-24 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden pb-24 selection:bg-primary/30 selection:text-white">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[700px] w-[700px] rounded-full bg-primary/10 blur-[130px] animate-pulse-slow" />
        <div className="absolute top-[30%] -right-[15%] h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[110px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      {/* ── 1. TOP NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
        <div className="container flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-soft overflow-hidden group-hover:scale-105 transition-transform">
              <img src={logo} alt="AceWassce" className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-base font-extrabold tracking-tight text-foreground">
              Ace<span className="gradient-text">Wassce</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Rank: #{userRank || 0}</span>
            </button>
            <button
              aria-label="Profile"
              className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all overflow-hidden"
            >
              <User className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container px-5 sm:px-8 max-w-6xl mx-auto mt-8">
        {/* ── 2. HEADER SECTION ── */}
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-[10px] font-bold text-primary uppercase tracking-widest">
                Student Portal
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <Sparkles className="h-2.5 w-2.5" /> Online
              </span>
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
              Akwaaba, <span className="gradient-text">{studentName}!</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              You're currently in the <span className="text-foreground font-bold">top {percentile}%</span> of students. Keep up the high performance!
            </p>
          </div>
          
          <div className="hidden lg:flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3 px-5 backdrop-blur-sm shadow-soft">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Daily Goal</p>
              <p className="text-sm font-extrabold text-foreground">{dailyGoalProgress}% Complete</p>
            </div>
            <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center text-[10px] font-black text-primary transition-all duration-1000" style={{ borderTopColor: 'hsl(214 100% 60%)', borderRightColor: dailyGoalProgress >= 50 ? 'hsl(214 100% 60%)' : 'transparent', borderBottomColor: dailyGoalProgress >= 75 ? 'hsl(214 100% 60%)' : 'transparent', borderLeftColor: dailyGoalProgress >= 100 ? 'hsl(214 100% 60%)' : 'transparent' }}>
              {dailyGoalProgress}%
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* ── 3. HERO ACTION CARD ── */}
            <section className="relative group">
              <div className="absolute inset-0 bg-gradient-hero blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-hero p-8 sm:p-12 shadow-glow animate-fade-up border border-white/10" style={{ animationDelay: "100ms" }}>
                <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-[80px] animate-float" />
                <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-black/30 blur-[90px]" />

                <div className="relative z-10 grid sm:grid-cols-2 gap-8 items-center">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                      <Clock className="h-3.5 w-3.5" /> Live Performance
                    </span>
                    <h2 className="mt-6 font-display text-4xl font-extrabold text-white sm:text-5xl leading-[1.05] tracking-tighter">
                      Core Maths <br/><span className="text-white/80 italic">Theory</span>
                    </h2>
                    <p className="mt-4 text-white/70 text-sm font-medium max-w-xs leading-relaxed">
                      Practice structured questions with instant AI feedback on your step-by-step workings.
                    </p>

                    <Button
                      size="lg"
                      onClick={() => navigate("/practice")}
                      className="mt-8 h-14 rounded-full bg-white text-primary hover:bg-white/90 font-black text-base shadow-elevated transition-all hover:scale-105 active:scale-95 border-0 px-8"
                    >
                      Start Mock Exam
                      <ArrowRight className="ml-2.5 h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="hidden sm:block">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-soft transform rotate-3 hover:rotate-0 transition-transform duration-500">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-white/60 uppercase">Last Result</p>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-black">
                          {lastResult ? (lastResult.total_score >= 50 ? "GOOD" : "NEEDS WORK") : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-end gap-3 mb-4">
                        <p className="text-5xl font-black text-white">{lastResult?.total_score || 0}<span className="text-2xl text-white/50">%</span></p>
                        <p className="text-xs text-white/60 mb-2">{lastResult ? (lastResult.total_score >= 60 ? "+ Higher than avg" : "- Below avg") : "Start first mock"}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000" style={{ width: `${lastResult?.total_score || 0}%` }} />
                        </div>
                        <p className="text-[10px] text-white/40 text-center font-bold uppercase tracking-widest">
                          {lastResult ? "Performance Overview" : "NO DATA YET"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 4. PERFORMANCE GRAPH ── */}
            <section className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-elevated border border-white/5 group">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-display font-extrabold tracking-tight flex items-center gap-2 group-hover:text-primary transition-colors">
                      <BarChart3 className="h-6 w-6 text-primary" /> Performance Analytics
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Tracking your growth across the last 6 mock sessions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-white/5 border border-white/10 flex">
                      {['Week', 'Month', 'All'].map((t) => (
                        <button key={t} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${t === 'Month' ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:text-white'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(214 100% 60%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(214 100% 60%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="rgba(255,255,255,0.2)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={15}
                        fontFamily="Outfit"
                        fontWeight="bold"
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.2)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}%`}
                        fontFamily="Outfit"
                        fontWeight="bold"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(10, 15, 30, 0.9)', 
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '20px',
                          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(10px)',
                          padding: '12px 16px',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }} 
                        itemStyle={{ color: 'hsl(214 100% 60%)', fontWeight: '900', fontSize: '16px' }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(214 100% 60%)" 
                        strokeWidth={5} 
                        dot={{ fill: 'hsl(218 55% 9%)', stroke: 'hsl(214 100% 60%)', strokeWidth: 3, r: 6 }} 
                        activeDot={{ r: 9, fill: 'white', stroke: 'hsl(214 100% 60%)', strokeWidth: 4 }}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-8 animate-fade-up" style={{ animationDelay: "300ms" }}>
            {/* ── 5. STATS GRID ── */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {stats.map(({ label, value, icon: Icon, color }, i) => (
                <div
                  key={label}
                  className="glass-card-hover group relative overflow-hidden rounded-3xl p-6 border border-white/5 shadow-soft transition-all"
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">
                        {label}
                      </p>
                      <p className="font-display text-3xl font-black text-foreground">
                        {value}
                      </p>
                    </div>
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 ${color} group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                      <Icon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="absolute -bottom-4 -right-4 h-16 w-16 bg-current opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" />
                </div>
              ))}
            </div>

            {/* ── 6. RECOMMENDATIONS ── */}
            <div className="glass-card rounded-[2.5rem] p-6 border border-white/5 shadow-elevated">
              <h3 className="text-md font-display font-extrabold tracking-tight mb-5 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" /> Topic Weaknesses
              </h3>
              <div className="space-y-4">
                {weaknesses.map((item) => (
                  <div key={item.topic} className="group cursor-pointer">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{item.topic}</p>
                      <p className="text-[10px] font-black text-muted-foreground">{item.progress}%</p>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div 
                        className={`h-full rounded-full ${item.color} shadow-sm group-hover:opacity-80 transition-all`} 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-6 rounded-xl border border-white/5 bg-white/5 text-xs font-bold text-muted-foreground hover:bg-white/10 hover:text-foreground">
                View Detailed Syllabus Breakdown
              </Button>
            </div>

            {/* ── 7. QUICK NAVIGATION ── */}
            <div className="bg-primary/10 border border-primary/20 rounded-[2.5rem] p-6 text-center shadow-glow group">
              <h4 className="font-display text-lg font-black text-primary mb-2 group-hover:scale-105 transition-transform">Ready for A1?</h4>
              <p className="text-xs text-primary/70 mb-5 font-medium leading-relaxed">Try our pro-mode timed examination for full exam simulation.</p>
              <Button className="w-full rounded-full bg-primary text-white shadow-glow hover:bg-primary/90 font-bold border-0">
                Unlock Pro Mocks
              </Button>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">
                Product of Sixzones Tech
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* ── 8. BOTTOM NAV ── */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
