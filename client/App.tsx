import "./global.css";

import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot, Root } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy load heavy pages
const Booking = lazy(() => import("./pages/Booking"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentCalendar = lazy(() => import("./pages/StudentCalendar"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <p className="text-gray-500">Cargando...</p>
  </div>
);

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
            <Route
              path="/booking"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <Booking />
                </Suspense>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Suspense fallback={<LoadingFallback />}>
                    <TeacherDashboard />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teacher"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Suspense fallback={<LoadingFallback />}>
                    <TeacherDashboard />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/student"
              element={
                <ProtectedRoute requiredRole="student">
                  <Suspense fallback={<LoadingFallback />}>
                    <StudentDashboard />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/student/calendar"
              element={
                <ProtectedRoute requiredRole="student">
                  <Suspense fallback={<LoadingFallback />}>
                    <StudentCalendar />
                  </Suspense>
                </ProtectedRoute>
              }
            />
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
