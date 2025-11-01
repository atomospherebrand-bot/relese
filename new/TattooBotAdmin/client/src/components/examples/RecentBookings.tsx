import { RecentBookings } from "../RecentBookings";

const mockBookings = [
  {
    id: "1",
    clientName: "Александр Иванов",
    masterName: "INKMAN",
    service: "Сеанс 2ч",
    date: "2025-10-23",
    time: "14:00",
    status: "confirmed" as const,
  },
  {
    id: "2",
    clientName: "Мария Петрова",
    masterName: "INKMAN",
    service: "Консультация",
    date: "2025-10-24",
    time: "11:00",
    status: "pending" as const,
  },
  {
    id: "3",
    clientName: "Дмитрий Сидоров",
    masterName: "INKMAN",
    service: "Сеанс 4ч",
    date: "2025-10-25",
    time: "16:00",
    status: "confirmed" as const,
  },
];

export default function RecentBookingsExample() {
  return (
    <div className="p-6 max-w-4xl">
      <RecentBookings bookings={mockBookings} />
    </div>
  );
}
