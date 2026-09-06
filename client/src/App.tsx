/*
 * Field Notes app shell: keep the archive header and notebook language consistent
 * across the plan workspace and every issue evidence page.
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { IssuesProvider } from "./contexts/IssuesContext";
import Home from "./pages/Home";
import IssueDetail from "./pages/IssueDetail";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL}>
      <Switch>
      <Route path="/" component={Home} />
      <Route path="/issues/:id" component={IssueDetail} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <IssuesProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </IssuesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
