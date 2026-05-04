import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User as UserIcon, 
  Settings, 
  Bell, 
  Shield, 
  LogOut, 
  Award, 
  Target, 
  TrendingUp,
  ChevronRight,
  Mail,
  Smartphone,
  Star,
  GraduationCap,
  Loader2
} from "lucide-react";
import Skeleton from "@/components/Skeleton";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // 1. Get Student Profile
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // 2. Get Rank (Total students with more points + 1)
      const { count: rankCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .gt("total_points", data?.total_points || 0);

      // 3. Get Mock Count for Statistics
      const { count: mockCount } = await supabase
        .from("exam_attempts")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "graded");

      const finalProfile = data || {
        full_name: user.user_metadata?.full_name || "New Student",
        phone_number: user.phone || user.email?.split("@")[0] || "No phone linked",
        school_name: "Set your school",
        total_points: 0
      };

      setProfile({
        ...finalProfile,
        rank: (rankCount || 0) + 1,
        level: Math.floor((finalProfile.total_points || 0) / 100) + 1,
        mock_count: mockCount || 0
      });

    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-12 animate-pulse">
        <div className="flex flex-col items-center gap-4 mt-8">
          <Skeleton variant="circle" className="h-28 w-28" />
          <Skeleton variant="text" className="h-8 w-1/2" />
          <Skeleton variant="text" className="h-4 w-1/3" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton variant="rectangle" className="h-20 w-full rounded-2xl" />
          <Skeleton variant="rectangle" className="h-20 w-full rounded-2xl" />
          <Skeleton variant="rectangle" className="h-20 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="text" className="h-6 w-1/4 mb-4" />
          <Skeleton variant="rectangle" className="h-48 w-full rounded-[2rem]" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="text" className="h-6 w-1/4 mb-4" />
          <Skeleton variant="rectangle" className="h-48 w-full rounded-[2rem]" />
        </div>
      </div>
    );
  }

  const initials = profile?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "??";

  const sections = [
    { 
      title: "Learning Progress", 
      items: [
        { icon: Award, label: "My Achievements", desc: profile?.total_points > 0 ? "First Milestone Reached" : "Start your first mock", color: "text-amber-400" },
        { icon: Target, label: "Daily Goals", desc: "Keep practicing", color: "text-rose-400" },
        { icon: TrendingUp, label: "Statistics", desc: `${profile?.mock_count || 0} mocks fully completed`, color: "text-blue-400" }
      ]
    },
    { 
      title: "Account Settings", 
      items: [
        { icon: Bell, label: "Notifications", desc: "Exam alerts & updates", color: "text-purple-400" },
        { icon: Shield, label: "Privacy & Security", desc: "Password & data", color: "text-emerald-400" },
        { icon: Settings, label: "General", desc: "App preferences", color: "text-slate-400" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden pb-24">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[130px] animate-pulse-slow" />
        <div className="absolute bottom-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[110px]" />
      </div>

      <main className="relative z-10 container px-5 py-8 max-w-2xl mx-auto">
        <section className="flex flex-col items-center text-center mt-6 mb-10 animate-fade-up">
          <div className="relative group">
            <div className="absolute inset-0 rounded-full bg-gradient-hero blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative h-28 w-28 rounded-full border-4 border-white/10 bg-card/80 backdrop-blur-md flex items-center justify-center text-4xl font-black text-white shadow-glow overflow-hidden">
              <span className="relative z-10">{initials}</span>
              <div className="absolute inset-0 bg-gradient-hero opacity-10" />
            </div>
            <button className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-white border-4 border-background flex items-center justify-center shadow-soft hover:scale-110 transition-transform">
              <Star className="h-4 w-4 fill-white" />
            </button>
          </div>
          
          <h1 className="mt-5 font-display text-2xl font-extrabold text-foreground">{profile?.full_name || "Guest User"}</h1>
          <div className="flex flex-col items-center gap-1 mt-1">
             <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
               <GraduationCap className="h-3.5 w-3.5 text-primary" /> {profile?.school_name || "School not set"}
             </p>
             <p className="text-xs text-muted-foreground/60">+{profile?.phone_number?.replace(/\+/g, '') || "No phone"}</p>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 mb-10 animate-fade-up" style={{ animationDelay: "100ms" }}>
          {[
            { label: "LEVEL", value: profile?.level || 1, color: "text-blue-400" },
            { label: "RANK", value: `#${profile?.rank || 1}`, color: "text-amber-400" },
            { label: "POINTS", value: profile?.total_points || 0, color: "text-emerald-400" }
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-[1.5rem] p-4 text-center border border-white/5">
              <p className="text-[10px] font-black text-muted-foreground tracking-widest mb-1">{stat.label}</p>
              <p className={`text-xl font-display font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-8">
          {sections.map((section, idx) => (
            <div key={section.title} className="animate-fade-up" style={{ animationDelay: `${(idx + 2) * 100}ms` }}>
              <h3 className="px-2 text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">
                {section.title}
              </h3>
              <div className="glass-card rounded-[2rem] overflow-hidden border border-white/5">
                {section.items.map((item, i) => (
                  <button 
                    key={item.label}
                    className={`w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-white/5 ${i !== section.items.length - 1 ? 'border-b' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4 animate-fade-up" style={{ animationDelay: "500ms" }}>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="w-full h-14 rounded-2xl bg-rose-500/5 text-rose-500 border border-rose-500/10 hover:bg-rose-500/10 hover:text-rose-500 font-bold group"
            >
              <LogOut className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              Sign Out
            </Button>
            <div className="mt-8 text-center flex flex-col items-center gap-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                A1 Preps v1.0.0 • Built in Ghana 🇬🇭
              </p>
              <p className="text-[9px] text-primary/60 font-semibold uppercase tracking-wider">
                Powered by Sixzones Technologies
              </p>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
