import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

interface Booking {
  id: string;
  clientName: string;
  masterName: string;
  service: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
}

interface CalendarViewProps {
  bookings: Booking[];
  onDateSelect: (date: string) => void;
  selectedDate?: string;
}

export function CalendarView({ bookings, onDateSelect, selectedDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const bookingsByDate = useMemo(() => {
    return bookings.reduce<Record<string, Booking[]>>((acc, booking) => {
      const key = booking.date.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    }, {});
  }, [bookings]);

  const getBookingsForDate = (isoDate: string) => bookingsByDate[isoDate] ?? [];

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1));
  };

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Календарь записей</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-32 text-center capitalize">
              {monthNames[month]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayBookings = getBookingsForDate(isoDate);
            const isSelected = selectedDate === isoDate;
            const hasBookings = dayBookings.length > 0;

            return (
              <button
                key={day}
                onClick={() => onDateSelect(isoDate)}
                className={`
                  relative aspect-square rounded-lg p-2 text-sm font-medium
                  transition-all hover-elevate
                  ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent'}
                  ${hasBookings ? 'ring-1 ring-primary/40' : ''}
                `}
                data-testid={`calendar-day-${day}`}
              >
                <span>{day}</span>
                {hasBookings && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <span
                        key={booking.id}
                        className={`h-1.5 w-1.5 rounded-full border border-background/60 ${
                          booking.status === "confirmed"
                            ? "bg-emerald-500"
                            : booking.status === "pending"
                              ? "bg-amber-500"
                              : "bg-destructive"
                        }`}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
