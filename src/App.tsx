import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Practice from "./pages/Practice.tsx";
import Instructions from "./pages/Instructions.tsx";
import MCQExam from "./pages/MCQExam.tsx";
import MCQSubmitSuccess from "./pages/MCQSubmitSuccess.tsx";
import TheoryExam from "./pages/TheoryExam.tsx";
import TheorySubmitSuccess from "./pages/TheorySubmitSuccess.tsx";
import ExamResults from "./pages/ExamResults.tsx";
import ResumeExam from "./pages/ResumeExam.tsx";
import Profile from "./pages/Profile.tsx";
import History from "./pages/History.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/instructions" element={<Instructions />} />
          <Route path="/exam/mcq" element={<MCQExam />} />
          <Route path="/exam/mcq-success" element={<MCQSubmitSuccess />} />
          <Route path="/exam/theory" element={<TheoryExam />} />
          <Route path="/exam/theory-success" element={<TheorySubmitSuccess />} />
          <Route path="/exam/results" element={<ExamResults />} />
          <Route path="/exam/resume" element={<ResumeExam />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<History />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
