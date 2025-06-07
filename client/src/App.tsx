import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AutomationPage from "@/pages/automation";
import DashboardPage from "@/pages/dashboard";
import ConfigurationPage from "@/pages/configuration";
import ConnectivityPage from "@/pages/connectivity";
import LogsPage from "@/pages/logs";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

function Router() {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header />
        <div className="p-6">
          <Switch>
            <Route path="/" component={AutomationPage} />
            <Route path="/automation" component={AutomationPage} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/configuration" component={ConfigurationPage} />
            <Route path="/connectivity" component={ConnectivityPage} />
            <Route path="/logs" component={LogsPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
