import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Router, Switch } from "wouter";

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
import { queryClient } from "@/lib/queryClient";

import Home from "@/pages/Home";
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
      <Route path="/" component={Home} />
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
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
              <SidebarTrigger className="shrink-0" />
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
              </div>
            </header>
            <div className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6">
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
        <Router>
          <Switch>
            <Route path="/login" component={Login} />
            <Route component={ProtectedAppShell} />
          </Switch>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
