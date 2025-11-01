import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Router, Switch, useLocation } from "wouter";

import AppSidebar from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/toaster";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

import Dashboard from "@/pages/Dashboard";
import Masters from "@/pages/Masters";
import Services from "@/pages/Services";
import Bookings from "@/pages/Bookings";
import Portfolio from "@/pages/Portfolio";
import BotMessages from "@/pages/BotMessagesPro";
import Clients from "@/pages/Clients";
import Schedule from "@/pages/Schedule";
import Certificates from "@/pages/Certificates";
import Excel from "@/pages/Excel";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/masters" component={Masters} />
      <Route path="/services" component={Services} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/bot-messages" component={BotMessages} />
      <Route path="/clients" component={Clients} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/certs" component={Certificates} />
      <Route path="/excel" component={Excel} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ProtectedAppShell() {
  const [, setLocation] = useLocation();

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem("isAuthenticated");
    setLocation("/login");
  }, [setLocation]);

  return (
    <ProtectedRoute>
      <SidebarProvider
        style={{ "--sidebar-width": "280px", "--sidebar-width-icon": "64px" } as React.CSSProperties}
      >
        <div className="flex min-h-screen bg-background text-foreground">
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
              <SidebarTrigger className="shrink-0" />
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Выйти"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background/95 to-background/80 p-6 md:p-8">
              <AppRoutes />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider delayDuration={150}>
          <Router>
            <Switch>
              <Route path="/login" component={Login} />
              <Route component={ProtectedAppShell} />
            </Switch>
          </Router>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
