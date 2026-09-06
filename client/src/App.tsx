import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { IssuesProvider } from "./contexts/IssuesContext";
import AdminControls from "./components/AdminControls";
import Home from "./pages/Home";
import IssueDetail from "./pages/IssueDetail";
import NotFound from "./pages/NotFound";
import ShareReport from "./pages/ShareReport";

function AdminRouter() {
  const { session, loading } = useAuth();
  const path = window.location.pathname.replace(import.meta.env.BASE_URL, "/").replace(/\/$/, "") || "/";
  const isPublicShare = path.startsWith("/share/");
  if (loading) return <div className="not-found-page"><p className="eyebrow">SITE / TRACE</p><h1>正在開啟檢查檔案…</h1></div>;
  return <WouterRouter base={import.meta.env.BASE_URL}><Switch><Route path="/share/:token" component={ShareReport} /><Route path="/" component={Home} /><Route path="/issues/:id" component={IssueDetail} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>{session && !isPublicShare && <AdminControls />}</WouterRouter>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><AuthProvider><IssuesProvider><TooltipProvider><Toaster /><AdminRouter /></TooltipProvider></IssuesProvider></AuthProvider></ThemeProvider></ErrorBoundary>;
}
