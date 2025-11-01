import * as React from "react";
import { Link, useLocation } from "wouter";
import {
  BadgeCheck,
  Calendar,
  FileSpreadsheet,
  Home,
  Image,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Главная", url: "/", icon: Home },
  { title: "Мастера", url: "/masters", icon: Users },
  { title: "Услуги", url: "/services", icon: Settings },
  { title: "Записи", url: "/bookings", icon: Calendar },
  { title: "Портфолио", url: "/portfolio", icon: Image },
  { title: "Сообщения бота", url: "/bot-messages", icon: MessageSquare },
  { title: "Клиенты", url: "/clients", icon: Users },
  { title: "График", url: "/schedule", icon: Calendar },
  { title: "Сертификаты", url: "/certs", icon: BadgeCheck },
  { title: "Excel", url: "/excel", icon: FileSpreadsheet },
  { title: "Настройки", url: "/settings", icon: Settings },
] satisfies Array<{
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}>;

const currentYear = new Date().getFullYear();

export default function AppSidebar() {
  const [pathname] = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold">
            Telegram Bot Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.url ||
                  (item.url !== "/" && pathname.startsWith(item.url));

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        href={item.url}
                        className={cn("flex items-center gap-2", active && "text-primary")}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="justify-start text-xs text-muted-foreground" disabled>
              © {currentYear} Tattoo Bot
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
