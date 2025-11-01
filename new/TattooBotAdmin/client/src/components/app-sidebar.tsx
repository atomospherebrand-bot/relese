import { Calendar, FileSpreadsheet, Home, Image, MessageSquare, Settings, Users, Briefcase } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuItems = [
  { title: "Главная", url: "/", icon: Home },
  { title: "Мастера", url: "/masters", icon: Users },
  { title: "Услуги", url: "/services", icon: Briefcase },
  { title: "Записи", url: "/bookings", icon: Calendar },
  { title: "Портфолио", url: "/portfolio", icon: Image },
  { title: "Сообщения бота", url: "/bot-messages", icon: MessageSquare },
  { title: "Excel", url: "/excel", icon: FileSpreadsheet },
  { title: "Настройки", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-2 py-4">
            Telegram Bot Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
