import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, Clock, BarChart3, Brain,
  Shield, Star, CheckCircle2,
} from "lucide-react";
import logo from "@/assets/ace_logo.png";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

/* ── Features ───────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Clock,
    title: "Real WAEC Timing",
    desc: "90-minute countdown, authentic question format — just like the real paper.",
  },
  {
    icon: BarChart3,
    title: "Instant WASSCE Grade",
    desc: "See your A1–F9 grade the moment you finish, with a full topic-level breakdown.",
  },
  {
    icon: Brain,
    title: "Know Your Weak Spots",
    desc: "Pinpoint exactly which topics need work. Stop guessing, start improving.",
  },
  {
    icon: Shield,
    title: "100% Syllabus-Aligned",
    desc: "Every question curated to match the official WAEC syllabus to the letter.",
  },
];

/* ── Testimonials ───────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "Abena Asante",
    school: "Accra Academy",
    grade: "A1",
    quote:
      "I went from C6 to A1 in Core Maths in 6 weeks. The instant grading and topic breakdown changed everything for me.",
  },
  {
    name: "Kofi Darko",
    school: "PRESEC, Accra",
    grade: "B2",
    quote:
      "The mock exams feel exactly like the real WAEC paper. I stopped panicking during the actual exam.",
  },
  {
    name: "Adjoa Mensah",
    school: "Holy Child School",
    grade: "A1",
    quote:
      "Best free resource in Ghana for WASSCE prep. I recommended it to my entire class.",
  },
];

/* ── Animated Pharses ───────────────────────────────────────────── */
const PHRASES = [
  "What if I wrote last year's WASSCE? What grade would I get?",
  "Would I pass Core Mathematics if the exam shifted to tomorrow?",
  "How do I turn my current C6 into a guaranteed A1?",
  "What are my actual weak spots in Integrated Science?",
  "Am I truly ready for the pressure of the WAEC final paper?",
  "Could I have scored higher with better time management?"
];

const AnimatedPhrases = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % PHRASES.length);
        setFade(true);
      }, 500); // Duration of fade out
    }, 4000); // Time between changes
    return () => clearInterval(interval);
  }, []);

  return (
    <p 
      className={`relative z-10 mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg transition-all duration-500 min-h-[3rem] ${
        fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {PHRASES[index]}
    </p>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
const Index = () => (
  <div className="min-h-screen bg-background overflow-x-hidden">
    <Navbar />

    {/* ════════════════════════════════
        HERO
    ════════════════════════════════ */}
    <section className="relative flex flex-col items-center justify-center text-center px-5 pt-24 pb-28 overflow-hidden mesh-bg">
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[540px] w-[540px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-600/15 blur-[100px]" />

      {/* Badge */}
      <span className="relative z-10 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm animate-fade-up">
        <Sparkles className="h-3.5 w-3.5" />
        Free for every Ghanaian student
      </span>

      {/* Headline */}
      <h1 className="relative z-10 mt-6 max-w-3xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-7xl animate-fade-up" style={{ animationDelay: "60ms" }}>
        Ace Your{" "}
        <span className="gradient-text">WASSCE.</span>
        <br />
        Score A1 or Better.
      </h1>

        <AnimatedPhrases />

      {/* CTAs */}
      <div className="relative z-10 mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-up" style={{ animationDelay: "180ms" }}>
        <Link to="/signup">
          <Button
            size="lg"
            className="h-16 rounded-full bg-gradient-hero border-0 px-12 text-base font-bold text-white shadow-glow hover:opacity-90 hover:scale-105 hover:shadow-elevated transition-all duration-200"
          >
            Start Free Mock Exam
            <ArrowRight className="ml-2.5 h-5 w-5" />
          </Button>
        </Link>
        <Link to="/login">
          <Button
            size="lg"
            variant="ghost"
            className="h-16 rounded-full border border-border/60 bg-white/5 px-10 text-base font-semibold text-foreground/80 backdrop-blur-sm hover:bg-white/10 hover:text-foreground transition-all duration-200"
          >
            Log In
          </Button>
        </Link>
      </div>

      {/* Trust row */}
      <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-xs text-muted-foreground animate-fade-up" style={{ animationDelay: "240ms" }}>
        {["No credit card", "50,000+ students", "100% WAEC syllabus"].map(t => (
          <span key={t} className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            {t}
          </span>
        ))}
      </div>

      {/* Hero glass card */}
      <div className="relative z-10 mx-auto mt-14 w-full max-w-xs animate-float">
        <div className="glass-card rounded-3xl p-5 shadow-elevated text-left">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-white text-sm font-bold shadow-soft flex-shrink-0">
              📐
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Core Mathematics</p>
              <p className="text-xs text-muted-foreground">50 Questions · 1h 30m</p>
            </div>
            <span className="ml-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              PASSED ✓
            </span>
          </div>
          {/* Score bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Your Score</span>
              <span className="font-bold text-foreground">84 / 100</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[84%] rounded-full bg-gradient-hero" />
            </div>
          </div>
          {/* Grade result */}
          <div className="flex items-center justify-between rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">WASSCE Grade</p>
              <p className="font-display text-2xl font-extrabold text-primary">A1</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Percentile</p>
              <p className="text-base font-bold text-foreground">Top 8%</p>
            </div>
            <span className="text-2xl">🏆</span>
          </div>
        </div>
      </div>
    </section>

    {/* ════════════════════════════════
        WHAT IT CAN DO
    ════════════════════════════════ */}
    <section className="relative py-24 px-5">
      {/* Subtle divider glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-5xl">
        {/* Heading */}
        <div className="text-center mb-14 animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            What A1 Preps Does
          </p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Everything You Need to <span className="gradient-text">Pass</span>
          </h2>
        </div>

        {/* 2×2 grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="glass-card-hover group rounded-2xl p-6 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 border border-primary/25 text-primary mb-4 group-hover:bg-primary/25 transition-colors">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-base font-bold text-foreground mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ════════════════════════════════
        TESTIMONIALS
    ════════════════════════════════ */}
    <section className="relative py-24 px-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {/* Soft glow behind */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-purple-600/10 blur-[100px]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="text-center mb-14 animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Student Stories
          </p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Real Students, <span className="gradient-text">Real Results</span>
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {TESTIMONIALS.map(({ name, school, grade, quote }, i) => (
            <div
              key={name}
              className="glass-card-hover group flex flex-col gap-4 rounded-2xl p-6 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Stars */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{quote}"</p>
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-sm font-bold text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{school}</p>
                </div>
                <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 font-display text-sm font-extrabold text-emerald-400">
                  {grade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ════════════════════════════════
        FOOTER / CTA BAND
    ════════════════════════════════ */}
    <footer className="relative border-t border-white/8 py-16 px-5">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-primary/8 to-transparent" />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* CTA */}
        <div className="mb-14 animate-fade-up">
          <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl mb-4">
            Your A1 is One Mock Away.
          </h2>
          <p className="text-muted-foreground text-sm mb-7 max-w-md mx-auto leading-relaxed">
            Join thousands of Ghanaian students already preparing smarter. Free, forever.
          </p>
          <Link to="/signup">
            <Button
              size="lg"
              className="h-13 rounded-full bg-gradient-hero border-0 px-10 text-sm font-bold text-white shadow-glow hover:opacity-90 hover:scale-105 hover:shadow-elevated transition-all duration-200"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Footer bar */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between border-t border-white/8 pt-8">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-soft overflow-hidden group-hover:scale-110 transition-transform">
              <img src={logo} alt="A1 Preps" className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-sm font-extrabold tracking-tight text-foreground">
              A1 <span className="gradient-text">Preps</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} A1 Preps · Built for Ghana 🇬🇭
          </p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <Link to="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="#" className="hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
        <div className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
          Powered by <span className="text-primary/60">Sixzones Technologies</span>
        </div>
      </div>
    </footer>
  </div>
);

export default Index;
