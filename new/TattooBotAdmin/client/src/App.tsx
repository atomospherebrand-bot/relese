import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Router, Switch, useLocation } from "wouter";

import AppSidebar, { menuItems } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { Menu, LogOut } from "lucide-react";

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
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const activeItem = React.useMemo(
    () => menuItems.find((item) => (item.url === "/" ? location === item.url : location.startsWith(item.url))),
    [location],
  );

  const handleNavigate = React.useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem("isAuthenticated");
    setLocation("/login");
  }, [setLocation]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#0f1218] text-white">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[260px] border-r-0 bg-[#14171f] p-0 text-white md:hidden">
            <AppSidebar variant="mobile" onNavigate={handleNavigate} />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-white/10 bg-[#121620]/70 px-4 py-4 backdrop-blur md:px-8">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="border-white/20 text-white/80 hover:bg-white/10 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="ml-1 flex flex-1 items-center justify-between md:ml-0">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-white/40">Панель управления</span>
                <span className="text-lg font-semibold text-white/90" data-testid="text-current-page">
                  {activeItem?.title ?? "Добро пожаловать"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white/80 hover:bg-white/10"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#0b0e13] p-4 md:p-8">
            <AppRoutes />
          </main>
        </div>
      </div>
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
