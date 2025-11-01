import { StatsCard } from "@/components/StatsCard";
import { RecentBookings } from "@/components/RecentBookings";
import { Calendar, Users, DollarSign, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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

  const formattedBookings = recentBookings.map((booking) => ({
    ...booking,
    date: formatDate(booking.date),
  }));

  const averageHours = averageDuration > 0 ? `${(averageDuration / 60).toFixed(1)}ч` : "—";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Главная</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <RecentBookings bookings={formattedBookings} />
    </div>
  );
}
