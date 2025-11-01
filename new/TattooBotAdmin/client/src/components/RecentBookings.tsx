import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Clock, X } from "lucide-react";

interface Booking {
  id: string;
  clientName: string;
  clientTelegram?: string;
  masterName: string;
  masterTelegram?: string;
  service: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
}

interface RecentBookingsProps {
  bookings: Booking[];
  selectedDate?: string;
  onResetFilter?: () => void;
}

const statusColors = {
  confirmed: "bg-green-500/10 text-green-700 dark:text-green-400",
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const statusLabels = {
  confirmed: "Подтверждена",
  pending: "Ожидает",
  cancelled: "Отменена",
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateLabelFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
});

export function RecentBookings({ bookings, selectedDate, onResetFilter }: RecentBookingsProps) {
  const selectionLabel = selectedDate ? dateLabelFormatter.format(new Date(selectedDate)) : null;
  const hasBookings = bookings.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние записи</CardTitle>
        {selectionLabel && (
          <CardDescription className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Отфильтровано по дате: <span className="font-medium text-foreground">{selectionLabel}</span>
            </span>
            {onResetFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={onResetFilter}
              >
                <X className="h-3.5 w-3.5" />
                Сбросить
              </Button>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {hasBookings ? (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const formattedDate = dateFormatter.format(new Date(booking.date));

              return (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card/60 p-4 shadow-sm transition-all hover:shadow-md"
                  data-testid={`booking-item-${booking.id}`}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium" data-testid="text-client-name">
                        {booking.clientName}
                      </span>
                      {booking.clientTelegram && (
                        <a
                          href={`https://t.me/${booking.clientTelegram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          @{booking.clientTelegram}
                        </a>
                      )}
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm text-muted-foreground">{booking.masterName}</span>
                      {booking.masterTelegram && (
                        <a
                          href={`https://t.me/${booking.masterTelegram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          @{booking.masterTelegram}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>{booking.service}</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{booking.time}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={statusColors[booking.status]} data-testid={`badge-status-${booking.status}`}>
                    {statusLabels[booking.status]}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <p>Нет записей за выбранный период.</p>
            {onResetFilter && (
              <Button variant="outline" size="sm" onClick={onResetFilter} className="mt-2">
                Сбросить фильтр
              </Button>
            )}
          </div>
        )}
        <Button variant="outline" className="mt-6 w-full" data-testid="button-view-all">
          Показать все
        </Button>
      </CardContent>
    </Card>
  );
}
