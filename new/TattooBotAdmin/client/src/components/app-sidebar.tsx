import * as React from "react";
import { Link, useLocation } from "wouter";
import {
  BadgeCheck,
  Briefcase,
  Calendar,
  Clock,
  FileSpreadsheet,
  Image,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserCircle,
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

const navigation = [
  {
    label: "Обзор",
    items: [
      {
        title: "Дашборд",
        url: "/",
        icon: LayoutDashboard,
        description: "Ключевые показатели и активность",
      },
    ],
  },
  {
    label: "Управление",
    items: [
      { title: "Записи", url: "/bookings", icon: Calendar },
      { title: "График", url: "/schedule", icon: Clock },
      { title: "Мастера", url: "/masters", icon: Users },
      { title: "Клиенты", url: "/clients", icon: UserCircle },
      { title: "Услуги", url: "/services", icon: Briefcase },
      { title: "Сертификаты", url: "/certs", icon: BadgeCheck },
    ],
  },
  {
    label: "Контент",
    items: [
      { title: "Портфолио", url: "/portfolio", icon: Image },
      { title: "Сообщения бота", url: "/bot-messages", icon: MessageSquare },
      { title: "Excel", url: "/excel", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Система",
    items: [{ title: "Настройки", url: "/settings", icon: Settings }],
  },
] satisfies Array<{
  label: string;
  items: Array<{
    title: string;
    url: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    description?: string;
  }>;
}>;

const currentYear = new Date().getFullYear();

export default function AppSidebar() {
  const [pathname] = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-sidebar">
      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.url ||
                    (item.url !== "/" && pathname.startsWith(item.url));

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-3",
                          "transition-colors data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
                          "hover:bg-muted/20 hover:text-foreground",
                        )}
                        tooltip={item.title}
                      >
                        <Link href={item.url} className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate text-sm font-medium tracking-wide">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
