import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Clock } from "lucide-react";

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

export function RecentBookings({ bookings }: RecentBookingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние записи</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
              data-testid={`booking-item-${booking.id}`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium" data-testid="text-client-name">{booking.clientName}</span>
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
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{booking.service}</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{booking.date}</span>
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
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4" data-testid="button-view-all">
          Показать все
        </Button>
      </CardContent>
    </Card>
  );
}
