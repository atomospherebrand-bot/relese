import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, DollarSign, Clock, CalendarClock } from "lucide-react";

import { StatsCard } from "@/components/StatsCard";
import { RecentBookings } from "@/components/RecentBookings";
import { CalendarView } from "@/components/CalendarView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

const formatCurrency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const formatDate = (date: string) => {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
};

export default function Dashboard() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
  });

  if (dashboardQuery.isLoading) {
    return <p>Загрузка данных…</p>;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <p className="text-destructive">Не удалось загрузить данные дашборда</p>;
  }

  const {
    stats: { bookingsToday, activeMasters, revenueWeek, averageDuration },
    recentBookings,
  } = dashboardQuery.data;

  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  const averageHours = averageDuration > 0 ? `${(averageDuration / 60).toFixed(1)}ч` : "—";

  const bookingsByDate = useMemo(() => {
    return recentBookings.reduce<Record<string, typeof recentBookings>>((acc, booking) => {
      const key = booking.date.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key] = [...acc[key], booking];
      return acc;
    }, {});
  }, [recentBookings]);

  const filteredBookings = useMemo(() => {
    if (!selectedDate) {
      return [...recentBookings].sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.time}:00`).getTime();
        const bTime = new Date(`${b.date}T${b.time}:00`).getTime();
        return bTime - aTime;
      });
    }

    const bookingsForDate = bookingsByDate[selectedDate] ?? [];
    return [...bookingsForDate].sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time}:00`).getTime();
      const bTime = new Date(`${b.date}T${b.time}:00`).getTime();
      return aTime - bTime;
    });
  }, [bookingsByDate, recentBookings, selectedDate]);

  const selectedDateStats = useMemo(() => {
    if (!selectedDate) return null;
    const items = bookingsByDate[selectedDate] ?? [];
    const total = items.length;
    const confirmed = items.filter((booking) => booking.status === "confirmed").length;
    const pending = items.filter((booking) => booking.status === "pending").length;
    const cancelled = items.filter((booking) => booking.status === "cancelled").length;
    return { total, confirmed, pending, cancelled };
  }, [bookingsByDate, selectedDate]);

  const handleDateSelect = (date: string) => {
    setSelectedDate((prev) => (prev === date ? undefined : date));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Сводка показателей студии и ближайших записей</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Записи сегодня"
          value={bookingsToday}
          icon={Calendar}
        />
        <StatsCard
          title="Активные мастера"
          value={activeMasters}
          icon={Users}
        />
        <StatsCard
          title="Доход за неделю"
          value={formatCurrency.format(revenueWeek)}
          icon={DollarSign}
        />
        <StatsCard
          title="Ср. время записи"
          value={averageHours}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <RecentBookings
            bookings={filteredBookings}
            selectedDate={selectedDate}
            onResetFilter={() => setSelectedDate(undefined)}
          />
        </div>
        <div className="space-y-6">
          <CalendarView
            bookings={recentBookings}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">День в фокусе</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {selectedDateStats ? (
                <>
                  <p>
                    <span className="font-medium text-foreground">{formatDate(selectedDate!)}:</span> {" "}
                    {selectedDateStats.total} записей
                  </p>
                  <ul className="space-y-1">
                    <li className="flex items-center justify-between">
                      <span>Подтверждено</span>
                      <span className="font-medium text-foreground">{selectedDateStats.confirmed}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>В ожидании</span>
                      <span className="font-medium text-foreground">{selectedDateStats.pending}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Отменено</span>
                      <span className="font-medium text-foreground">{selectedDateStats.cancelled}</span>
                    </li>
                  </ul>
                </>
              ) : (
                <div className="text-center text-sm">
                  <CalendarClock className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                  <p>Выберите дату в календаре, чтобы увидеть детальную сводку.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
