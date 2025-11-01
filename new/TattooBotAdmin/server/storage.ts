import { randomUUID } from "crypto";
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import {
  bookingSchema,
  bookingStatusSchema,
  bookingsTable,
  botMessageSchema,
  botMessagesTable,
  insertBookingSchema,
  insertMasterSchema,
  insertServiceSchema,
  masterSchema,
  mastersTable,
  portfolioItemSchema,
  portfolioTable,
  serviceSchema,
  servicesTable,
  settingsSchema,
  settingsTable,
  type Booking,
  type BotMessage,
  type InsertBooking,
  type InsertMaster,
  type InsertService,
  type Master,
  type PortfolioItem,
  type Service,
  type Settings,
} from "@shared/schema";
import { db } from "./db";
import { z } from "zod";

function normalizeUploadUrl(u: string | null | undefined): string {
  if (!u) return "";
  let url = String(u).trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/uploads\//.test(url)) return url;
  url = url.replace(/^\.\/?uploads\//, "").replace(/^uploads\//, "");
  if (url && !/^\/uploads\//.test(url)) {
    url = "/uploads/" + url;
  }
  return url;
}

function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function createDefaultMasters(): Master[] {
  return [
    {
      id: randomUUID(),
      name: "Александр",
      nickname: "INKMAN",
      telegram: "inkman_tattoo",
      specialization: "Черно-белая графика, реализм, минимализм",
      avatar: undefined,
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Мария",
      nickname: "INK_QUEEN",
      telegram: "ink_queen_art",
      specialization: "Цветные работы, акварель",
      avatar: undefined,
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Дмитрий",
      nickname: "DARK_ART",
      telegram: "dark_art_ink",
      specialization: "Дарк-арт, блэкворк",
      avatar: undefined,
      isActive: false,
    },
  ];
}

function createDefaultServices(): Service[] {
  return [
    {
      id: randomUUID(),
      name: "Сеанс 2ч",
      duration: 120,
      price: 12000,
      description: "Стандартный сеанс тату",
    },
    {
      id: randomUUID(),
      name: "Сеанс 4ч",
      duration: 240,
      price: 22000,
      description: "Расширенный сеанс для крупных работ",
    },
    {
      id: randomUUID(),
      name: "Консультация",
      duration: 30,
      price: 0,
      description: "Бесплатная консультация и разработка эскиза",
    },
  ];
}

function createDefaultMessages(): BotMessage[] {
  return [
    {
      id: randomUUID(),
      key: "welcome",
      label: "Приветствие",
      value:
        "👋 Привет! Я бот тату-мастера.\n• Запись в пару кликов\n• Напомню о визите\n• Покажу маршрут до студии\n\nРаботаю 24/7 и экономлю до 8 часов в неделю.",
      type: "textarea",
      imageUrl: null,
    },
    {
      id: randomUUID(),
      key: "booking_start",
      label: "Начало записи",
      value:
        "Услуга: {service}\nДлительность: {duration} мин\nЦена: {price} ₽\n\nВыберите дату:",
      type: "textarea",
      imageUrl: null,
    },
    {
      id: randomUUID(),
      key: "booking_confirmed",
      label: "Подтверждение записи",
      value:
        "✅ Запись подтверждена!\n\nУслуга: {service}\nДата и время: {date} • {time}\nАдрес: {address}\n\nЯ пришлю напоминание заранее. До встречи!",
      type: "textarea",
      imageUrl: null,
    },
    {
      id: randomUUID(),
      key: "button_booking",
      label: "Кнопка записи",
      value: "📅 Записаться",
      type: "text",
      imageUrl: null,
    },
    {
      id: randomUUID(),
      key: "button_portfolio",
      label: "Кнопка портфолио",
      value: "🖼️ Портфолио",
      type: "text",
      imageUrl: null,
    },
    {
      id: randomUUID(),
      key: "button_location",
      label: "Кнопка локации",
      value: "📍 Как добраться",
      type: "text",
      imageUrl: null,
    },
  ];
}

function createDefaultPortfolio(): PortfolioItem[] {
  return [
  ];
}

const DEFAULT_SETTINGS: Settings = {
  botToken: "",
  studioName: "Тату-студия INKMAN",
  address: "Москва, ул. Примера, 1",
  yandexMapUrl: "https://yandex.ru/maps/?ll=37.617700,55.755800&z=16",
  latitude: "55.755800",
  longitude: "37.617700",
  paymentMethods: "Наличные, СБП, Карта, Криптовалюта",
  workingHours: "Ежедневно с 10:00 до 22:00",
};

function formatSlot(date: string, time: string, duration: number) {
  const [hours, minutes] = time.split(":").map((v) => parseInt(v, 10));
  const start = new Date(`${date}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return { start, end };
}

interface BookingRow {
  id: string;
  clientName: string;
  clientPhone: string;
  clientTelegram: string | null;
  masterId: string;
  serviceId: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  notes: string | null;
  masterName: string | null;
  masterNickname: string | null;
  masterTelegram: string | null;
  serviceName: string | null;
}

export class DatabaseStorage {
  private ready: Promise<void>;

  constructor(private readonly database = db) {
    this.ready = this.initialize();
  }

  private async initialize() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    const masters = await this.database.select().from(mastersTable).limit(1);
    if (masters.length === 0) {
      const defaults = createDefaultMasters();
      if (defaults.length > 0) {
        await this.database.insert(mastersTable).values(
          defaults.map((m) => ({
            id: m.id,
            name: m.name,
            nickname: m.nickname,
            telegram: m.telegram ?? null,
            specialization: m.specialization,
            avatar: m.avatar ?? null,
            teletypeUrl: m.teletypeUrl ?? null,
            isActive: m.isActive,
          })),
        );
      }
    }

    const services = await this.database.select().from(servicesTable).limit(1);
    if (services.length === 0) {
      const defaults = createDefaultServices();
      if (defaults.length > 0) {
        await this.database.insert(servicesTable).values(defaults);
      }
    }

    const messages = await this.database.select().from(botMessagesTable).limit(1);
    if (messages.length === 0) {
      const defaults = createDefaultMessages();
      if (defaults.length > 0) {
        await this.database.insert(botMessagesTable).values(defaults);
      }
    }

    const portfolio = await this.database.select().from(portfolioTable).limit(1);
    if (portfolio.length === 0) {
      const defaults = createDefaultPortfolio();
      if (defaults.length > 0) {
        await this.database.insert(portfolioTable).values(defaults);
      }
    }

    const settings = await this.database
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, "default"))
      .limit(1);

    if (settings.length === 0) {
      await this.database.insert(settingsTable).values({
        id: "default",
        botToken: DEFAULT_SETTINGS.botToken,
        studioName: DEFAULT_SETTINGS.studioName,
        address: DEFAULT_SETTINGS.address,
        yandexMapUrl: DEFAULT_SETTINGS.yandexMapUrl ?? null,
        latitude: DEFAULT_SETTINGS.latitude ?? null,
        longitude: DEFAULT_SETTINGS.longitude ?? null,
        paymentMethods: DEFAULT_SETTINGS.paymentMethods,
        workingHours: DEFAULT_SETTINGS.workingHours,
      });
    }
  }

  private async ensureReady() { await this.ready; }

  private mapMaster(row: typeof mastersTable.$inferSelect): Master {
    return masterSchema.parse({
      id: row.id,
      name: row.name,
      nickname: row.nickname,
      telegram: optional(row.telegram),
      specialization: row.specialization,
      avatar: optional(row.avatar),
      teletypeUrl: optional(row.teletypeUrl),
      isActive: row.isActive,
    });
  }

  private mapService(row: typeof servicesTable.$inferSelect): Service {
    return serviceSchema.parse({
      id: row.id,
      name: row.name,
      duration: row.duration,
      price: row.price,
      description: row.description ?? "",
    });
  }

  private mapMessage(row: typeof botMessagesTable.$inferSelect): BotMessage {
    return botMessageSchema.parse({
      id: row.id,
      key: row.key,
      label: row.label,
      value: row.value,
      type: row.type as BotMessage["type"],
      imageUrl: row.imageUrl,
    });
  }

  private mapPortfolio(row: typeof portfolioTable.$inferSelect): PortfolioItem {
    return portfolioItemSchema.parse({
      id: row.id,
      url: row.url,
      title: row.title,
      masterId: optional(row.masterId),
      style: optional(row.style),
      mediaType: (row.mediaType as PortfolioItem["mediaType"]) ?? "image",
      thumbnail: optional(row.thumbnail),
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : (row.createdAt as string | undefined),
    });
  }

  private normalizeBooking(row: BookingRow): Booking {
    const timeValue = row.time.length > 5 ? row.time.slice(0, 5) : row.time;
    return bookingSchema.parse({
      id: row.id,
      clientName: row.clientName,
      clientPhone: row.clientPhone,
      clientTelegram: optional(row.clientTelegram),
      masterId: row.masterId,
      masterName: row.masterNickname ?? row.masterName ?? "",
      masterTelegram: optional(row.masterTelegram),
      serviceId: row.serviceId,
      service: row.serviceName ?? "",
      date: row.date,
      time: timeValue,
      duration: row.duration,
      status: row.status as Booking["status"],
      notes: optional(row.notes),
    });
  }

  private async getBookingById(id: string): Promise<Booking | undefined> {
    const rows = await this.database
      .select({
        id: bookingsTable.id,
        clientName: bookingsTable.clientName,
        clientPhone: bookingsTable.clientPhone,
        clientTelegram: bookingsTable.clientTelegram,
        masterId: bookingsTable.masterId,
        serviceId: bookingsTable.serviceId,
        date: bookingsTable.date,
        time: bookingsTable.time,
        duration: bookingsTable.duration,
        status: bookingsTable.status,
        notes: bookingsTable.notes,
        masterName: mastersTable.name,
        masterNickname: mastersTable.nickname,
        masterTelegram: mastersTable.telegram,
        serviceName: servicesTable.name,
      })
      .from(bookingsTable)
      .leftJoin(mastersTable, eq(bookingsTable.masterId, mastersTable.id))
      .leftJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
      .where(eq(bookingsTable.id, id))
      .limit(1);

    if (rows.length === 0) return undefined;
    return this.normalizeBooking(rows[0]);
  }

  private async isSlotAvailable(
    masterId: string,
    date: string,
    time: string,
    duration: number,
    ignoreBookingId?: string,
  ): Promise<boolean> {
    const conditions = [
      eq(bookingsTable.masterId, masterId),
      eq(bookingsTable.date, date),
      ne(bookingsTable.status, "cancelled"),
    ];
    if (ignoreBookingId) conditions.push(ne(bookingsTable.id, ignoreBookingId));

    const existing = await this.database
      .select({ id: bookingsTable.id, time: bookingsTable.time, duration: bookingsTable.duration })
      .from(bookingsTable)
      .where(and(...conditions));

    const { start, end } = formatSlot(date, time, duration);

    return existing.every((booking) => {
      const slot = formatSlot(
        date,
        booking.time.length > 5 ? booking.time.slice(0, 5) : booking.time,
        booking.duration,
      );
      return end <= slot.start || start >= slot.end;
    });
  }

  async listMasters(): Promise<Master[]> {
    await this.ensureReady();
    const rows = await this.database.select().from(mastersTable).orderBy(asc(mastersTable.name));
    return rows.map((row) => this.mapMaster(row));
  }

  async createMaster(input: InsertMaster): Promise<Master> {
    await this.ensureReady();
    const data = insertMasterSchema.parse(input);
    const master = masterSchema.parse({ id: randomUUID(), ...data });
    await this.database.insert(mastersTable).values({
      id: master.id,
      name: master.name,
      nickname: master.nickname,
      telegram: master.telegram ?? null,
      specialization: master.specialization,
      avatar: master.avatar ?? null,
      teletypeUrl: master.teletypeUrl ?? null,
      isActive: master.isActive,
    });
    return master;
  }

  async updateMaster(id: string, input: Partial<InsertMaster>): Promise<Master | undefined> {
    await this.ensureReady();
    const existing = await this.database
      .select()
      .from(mastersTable)
      .where(eq(mastersTable.id, id))
      .limit(1);

    if (existing.length === 0) return undefined;

    const merged = {
      id,
      name: input.name ?? existing[0].name,
      nickname: input.nickname ?? existing[0].nickname,
      telegram:
        input.telegram !== undefined ? (input.telegram ?? undefined) : optional(existing[0].telegram),
      specialization: input.specialization ?? existing[0].specialization,
      avatar: input.avatar !== undefined ? (input.avatar ?? undefined) : optional(existing[0].avatar),
      teletypeUrl:
        input.teletypeUrl !== undefined ? (input.teletypeUrl ?? undefined) : optional(existing[0].teletypeUrl),
      isActive: input.isActive ?? existing[0].isActive,
    } satisfies Master;

    const validated = masterSchema.parse(merged);

    await this.database
      .update(mastersTable)
      .set({
        name: validated.name,
        nickname: validated.nickname,
        telegram: validated.telegram ?? null,
        specialization: validated.specialization,
        avatar: validated.avatar ?? null,
        teletypeUrl: validated.teletypeUrl ?? null,
        isActive: validated.isActive,
      })
      .where(eq(mastersTable.id, id));

    return validated;
  }

  async deleteMaster(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.database.delete(mastersTable).where(eq(mastersTable.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async listServices(): Promise<Service[]> {
    await this.ensureReady();
    const rows = await this.database.select().from(servicesTable).orderBy(asc(servicesTable.name));
    return rows.map((row) => this.mapService(row));
  }

  async createService(input: InsertService): Promise<Service> {
    await this.ensureReady();
    const data = insertServiceSchema.parse(input);
    const service = serviceSchema.parse({ id: randomUUID(), ...data });
    await this.database.insert(servicesTable).values(service);
    return service;
  }

  async updateService(id: string, input: Partial<InsertService>): Promise<Service | undefined> {
    await this.ensureReady();
    const existing = await this.database
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.id, id))
      .limit(1);

    if (existing.length === 0) return undefined;

    const merged = {
      id,
      name: input.name ?? existing[0].name,
      duration: input.duration ?? existing[0].duration,
      price: input.price ?? existing[0].price,
      description: input.description ?? existing[0].description,
    } satisfies Service;

    const validated = serviceSchema.parse(merged);

    await this.database
      .update(servicesTable)
      .set({
        name: validated.name,
        duration: validated.duration,
        price: validated.price,
        description: validated.description,
      })
      .where(eq(servicesTable.id, id));

    return validated;
  }

  async deleteService(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.database.delete(servicesTable).where(eq(servicesTable.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async listBookings(): Promise<Booking[]> {
    await this.ensureReady();
    const rows = await this.database
      .select({
        id: bookingsTable.id,
        clientName: bookingsTable.clientName,
        clientPhone: bookingsTable.clientPhone,
        clientTelegram: bookingsTable.clientTelegram,
        masterId: bookingsTable.masterId,
        serviceId: bookingsTable.serviceId,
        date: bookingsTable.date,
        time: bookingsTable.time,
        duration: bookingsTable.duration,
        status: bookingsTable.status,
        notes: bookingsTable.notes,
        masterName: mastersTable.name,
        masterNickname: mastersTable.nickname,
        masterTelegram: mastersTable.telegram,
        serviceName: servicesTable.name,
      })
      .from(bookingsTable)
      .leftJoin(mastersTable, eq(bookingsTable.masterId, mastersTable.id))
      .leftJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
      .orderBy(desc(bookingsTable.date), desc(bookingsTable.time), desc(bookingsTable.createdAt));

    return rows.map((row) => this.normalizeBooking(row));
  }

  async createBooking(input: InsertBooking): Promise<Booking> {
    await this.ensureReady();
    const payload = insertBookingSchema.parse({ ...input, status: input.status ?? "pending" });

    const serviceRows = await this.database
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.id, payload.serviceId))
      .limit(1);
    if (serviceRows.length === 0) throw new Error("Service not found");
    const duration = serviceRows[0].duration;

    if (!(await this.isSlotAvailable(payload.masterId, payload.date, payload.time, duration))) {
      throw new Error("Выбранное время занято. Пожалуйста, выберите другое время.");
    }

    const bookingId = randomUUID();

    await this.database.insert(bookingsTable).values({
      id: bookingId,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      clientTelegram: payload.clientTelegram ?? null,
      masterId: payload.masterId,
      serviceId: payload.serviceId,
      date: payload.date,
      time: payload.time,
      duration,
      status: (payload.status ?? "pending") as Booking["status"],
      notes: payload.notes ?? null,
    });

    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error("Failed to create booking");
    return booking;
  }

  async updateBooking(id: string, input: Partial<InsertBooking>): Promise<Booking | undefined> {
    await this.ensureReady();
    const existing = await this.database
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, id))
      .limit(1);

    if (existing.length === 0) return undefined;

    const current = existing[0];

    const masterId = input.masterId ?? current.masterId;
    const serviceId = input.serviceId ?? current.serviceId;
    const date = input.date ?? current.date;
    const time = input.time ?? (typeof current.time === "string" ? current.time.slice(0, 5) : current.time);

    const serviceRows = await this.database
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId))
      .limit(1);
    if (serviceRows.length === 0) throw new Error("Service not found");
    const duration = serviceRows[0].duration;

    if (!(await this.isSlotAvailable(masterId, date, time, duration, id))) {
      throw new Error("Выбранное время занято. Пожалуйста, выберите другое время.");
    }

    const status = input.status ? bookingStatusSchema.parse(input.status) : (current.status as Booking["status"]);

    await this.database
      .update(bookingsTable)
      .set({
        clientName: input.clientName ?? current.clientName,
        clientPhone: input.clientPhone ?? current.clientPhone,
        clientTelegram:
          input.clientTelegram !== undefined ? input.clientTelegram ?? null : current.clientTelegram,
        masterId,
        serviceId,
        date,
        time,
        duration,
        status,
        notes: input.notes !== undefined ? input.notes ?? null : current.notes,
      })
      .where(eq(bookingsTable.id, id));

    return this.getBookingById(id);
  }

  async deleteBooking(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.database.delete(bookingsTable).where(eq(bookingsTable.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateBookingStatus(
    id: string,
    status: "pending" | "confirmed" | "cancelled",
  ): Promise<Booking | undefined> {
    await this.ensureReady();
    const normalized = bookingStatusSchema.parse(status);
    const result = await this.database
      .update(bookingsTable)
      .set({ status: normalized })
      .where(eq(bookingsTable.id, id))
      .returning({ id: bookingsTable.id });

    if (result.length === 0) return undefined;
    return this.getBookingById(id);
  }

  async listMessages(): Promise<BotMessage[]> {
    await this.ensureReady();
    const rows = await this.database.select().from(botMessagesTable).orderBy(asc(botMessagesTable.label));
    return rows.map((row) => this.mapMessage(row));
  }

  async saveMessages(messages: BotMessage[]): Promise<BotMessage[]> {
    await this.ensureReady();
    const validated = z.array(botMessageSchema).parse(messages);

    await this.database.transaction(async (tx) => {
      for (const message of validated) {
        await tx
          .insert(botMessagesTable)
          .values({
            id: message.id,
            key: message.key,
            label: message.label,
            value: message.value,
            type: message.type,
            imageUrl: message.imageUrl ?? null,
          })
          .onConflictDoUpdate({
            target: botMessagesTable.id,
            set: {
              key: message.key,
              label: message.label,
              value: message.value,
              type: message.type,
              imageUrl: message.imageUrl ?? null,
            },
          });
      }
    });

    return this.listMessages();
  }

  async listPortfolio(): Promise<PortfolioItem[]> {
    await this.ensureReady();
    const rows = await this.database
      .select()
      .from(portfolioTable)
      .orderBy(desc(portfolioTable.createdAt), desc(portfolioTable.id));
    const out: PortfolioItem[] = [];
    for (const row of rows) {
      try {
        out.push(this.mapPortfolio(row));
      } catch (e: any) {
        if (e && String(e.message).includes("skip_invalid_portfolio")) continue;
      }
    }
    return out;
  }

  async listPortfolioByMaster(
    masterId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: PortfolioItem[]; total: number; page: number; pageSize: number }> {
    await this.ensureReady();
    const offset = (page - 1) * pageSize;
    
    const [countResult] = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(portfolioTable)
      .where(eq(portfolioTable.masterId, masterId));
    
    const rows = await this.database
      .select()
      .from(portfolioTable)
      .where(eq(portfolioTable.masterId, masterId))
      .orderBy(desc(portfolioTable.createdAt), desc(portfolioTable.id))
      .limit(pageSize)
      .offset(offset);
    
    const items: PortfolioItem[] = [];
    for (const row of rows) {
      try {
        items.push(this.mapPortfolio(row));
      } catch (e: any) {
        if (e && String(e.message).includes("skip_invalid_portfolio")) continue;
      }
    }
    
    return {
      items,
      total: Number(countResult?.count ?? 0),
      page,
      pageSize,
    };
  }

  async addPortfolioItem(input: Omit<PortfolioItem, "id">): Promise<PortfolioItem> {
    await this.ensureReady();
    const validated = portfolioItemSchema.omit({ id: true }).parse(input);
    const [row] = await this.database
      .insert(portfolioTable)
      .values({
        id: randomUUID(),
        url: validated.url,
        title: validated.title,
        masterId: validated.masterId ?? null,
        style: validated.style ?? null,
        mediaType: validated.mediaType,
        thumbnail: validated.thumbnail ?? null,
      })
      .returning();

    return this.mapPortfolio(row);
  }

  async removePortfolioItem(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.database.delete(portfolioTable).where(eq(portfolioTable.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSettings(): Promise<Settings> {
    await this.ensureReady();
    const rows = await this.database
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, "default"))
      .limit(1);

    if (rows.length === 0) {
      return settingsSchema.parse(DEFAULT_SETTINGS);
    }

    return settingsSchema.parse({
      botToken: rows[0].botToken ?? "",
      studioName: rows[0].studioName,
      address: rows[0].address,
      yandexMapUrl: (rows[0] as any).yandexMapUrl ?? undefined,
      latitude: (rows[0] as any).latitude ?? undefined,
      longitude: (rows[0] as any).longitude ?? undefined,
      paymentMethods: rows[0].paymentMethods ?? "",
      workingHours: rows[0].workingHours ?? "",
    });
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    await this.ensureReady();
    const validated = settingsSchema.parse(settings);

    await this.database
      .insert(settingsTable)
      .values({
        id: "default",
        botToken: validated.botToken,
        studioName: validated.studioName,
        address: validated.address,
        yandexMapUrl: (validated as any).yandexMapUrl ?? null,
        latitude: (validated as any).latitude ?? null,
        longitude: (validated as any).longitude ?? null,
        paymentMethods: validated.paymentMethods,
        workingHours: validated.workingHours,
      })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: {
          botToken: validated.botToken,
          studioName: validated.studioName,
          address: validated.address,
          yandexMapUrl: (validated as any).yandexMapUrl ?? null,
          latitude: (validated as any).latitude ?? null,
          longitude: (validated as any).longitude ?? null,
          paymentMethods: validated.paymentMethods,
          workingHours: validated.workingHours,
          updatedAt: new Date(),
        },
      });

    return validated;
  }

  async dashboardSummary() {
    await this.ensureReady();
    const bookings = await this.listBookings();
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const bookingsToday = bookings.filter(
      (b) => b.date === today && b.status !== "cancelled",
    ).length;

    const activeMastersCount = await this.database
      .select({ id: mastersTable.id })
      .from(mastersTable)
      .where(eq(mastersTable.isActive, true));

    const revenueRows = await this.database
      .select({
        date: bookingsTable.date,
        time: bookingsTable.time,
        status: bookingsTable.status,
        price: servicesTable.price,
      })
      .from(bookingsTable)
      .innerJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
      .where(and(gte(bookingsTable.date, sevenDaysAgo), eq(bookingsTable.status, "confirmed")));

    const revenueWeek = revenueRows.reduce((total, row) => total + row.price, 0);

    const averageDuration = bookings.length
      ? bookings.reduce((sum, b) => sum + b.duration, 0) / bookings.length
      : 0;

    const recentBookings = bookings
      .slice()
      .sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.time}:00`).getTime();
        const bDate = new Date(`${b.date}T${b.time}:00`).getTime();
        return bDate - aDate;
      })
      .slice(0, 5);

    return {
      stats: {
        bookingsToday,
        activeMasters: activeMastersCount.length,
        revenueWeek,
        averageDuration,
      },
      recentBookings,
    };
  }

  async getAvailableSlots(masterId: string, date: string, duration: number): Promise<string[]> {
    await this.ensureReady();
    const openingHour = 10;
    const closingHour = 22;
    const stepMinutes = 30;
    const slots: string[] = [];

    const existing = await this.database
      .select({ time: bookingsTable.time, duration: bookingsTable.duration })
      .from(bookingsTable)
      .where(and(eq(bookingsTable.masterId, masterId), eq(bookingsTable.date, date), ne(bookingsTable.status, "cancelled")));

    for (let hour = openingHour; hour <= closingHour; hour++) {
      for (let minute = 0; minute < 60; minute += stepMinutes) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const slotToInsert = formatSlot(date, time, duration);
        if (
          slotToInsert.end.getHours() > closingHour ||
          (slotToInsert.end.getHours() === closingHour && slotToInsert.end.getMinutes() > 0)
        ) {
          continue;
        }

        const available = existing.every((booking) => {
          const slot = formatSlot(
            date,
            booking.time.length > 5 ? booking.time.slice(0, 5) : booking.time,
            booking.duration,
          );
          return slotToInsert.end <= slot.start || slotToInsert.start >= slot.end;
        });

        if (available) slots.push(time);
      }
    }

    return slots;
  }
}

let _storage: DatabaseStorage | null = null;
export function getStorage(): DatabaseStorage {
  if (!_storage) _storage = new DatabaseStorage();
  return _storage;
}
