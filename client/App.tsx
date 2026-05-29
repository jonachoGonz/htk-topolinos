import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot, Root } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Booking from "./pages/Booking";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentCalendar from "./pages/StudentCalendar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<TeacherDashboard />} />
            <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
            <Route path="/dashboard/student" element={<StudentCalendar />} />
            <Route path="/dashboard/student/calendar" element={<StudentCalendar />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Store root reference in window for HMR support
declare global {
  interface Window {
    __REACT_ROOT__?: Root;
  }
}

const rootContainer = document.getElementById("root");

if (rootContainer) {
  if (!window.__REACT_ROOT__) {
    window.__REACT_ROOT__ = createRoot(rootContainer);
  }
  window.__REACT_ROOT__.render(<App />);
}
