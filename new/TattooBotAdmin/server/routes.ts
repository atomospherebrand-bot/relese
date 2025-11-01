import type { Express, RequestHandler } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import { getStorage } from "./storage";
import { botManager } from "./botManager";
import { attachNotificationRoutes } from "./routes.notify";
import { attachStatsRoutes } from "./routes.stats";
function normalizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  let v = String(url).trim();
  if (!v) return "";
  // add protocol if missing
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  return v;
}

import {
  insertMasterSchema,
  insertServiceSchema,
  insertBookingSchema,
  bookingStatusSchema,
  botMessageSchema,
  settingsSchema,
  type BotAction,
} from "@shared/schema";
import portfolioRouter from "./routes/portfolio";
import botRouter from "./routes/bot";

const upload = multer({ storage: multer.memoryStorage() });

const asyncHandler = (handler: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const api = Router();
  const storage = getStorage();

  attachStatsRoutes(api);
  attachNotificationRoutes(api);

  api.get(
    "/health",
    asyncHandler(async (_req, res) => {
      res.json({ status: "ok" });
    }),
  );

  api.get(
    "/masters",
    asyncHandler(async (_req, res) => {
      const masters = await storage.listMasters();
      res.json({ masters });
    }),
  );

  api.post(
    "/masters",
    asyncHandler(async (req, res) => {
      req.body = req.body || {};
      if (typeof req.body.teletypeUrl !== "undefined") {
        req.body.teletypeUrl = normalizeUrl(req.body.teletypeUrl);
      }
      const payload = insertMasterSchema.parse(req.body);
      const master = await storage.createMaster(payload);
      res.status(201).json({ master });
    }),
  );

  api.put(
    "/masters/:id",
    asyncHandler(async (req, res) => {
      req.body = req.body || {};
      if (typeof req.body.teletypeUrl !== "undefined") {
        req.body.teletypeUrl = normalizeUrl(req.body.teletypeUrl);
      }
      const payload = insertMasterSchema.partial().parse(req.body);
      const master = await storage.updateMaster(req.params.id, payload);
      if (!master) {
        return res.status(404).json({ message: "Мастер не найден" });
      }
      res.json({ master });
    }),
  );

  api.delete(
    "/masters/:id",
    asyncHandler(async (req, res) => {
      const removed = await storage.deleteMaster(req.params.id);
      if (!removed) {
        return res.status(404).json({ message: "Мастер не найден" });
      }
      res.status(204).send();
    }),
  );

  api.get(
    "/services",
    asyncHandler(async (_req, res) => {
      const services = await storage.listServices();
      res.json({ services });
    }),
  );

  api.post(
    "/services",
    asyncHandler(async (req, res) => {
      const payload = insertServiceSchema.parse(req.body);
      const service = await storage.createService(payload);
      res.status(201).json({ service });
    }),
  );

  api.put(
    "/services/:id",
    asyncHandler(async (req, res) => {
      const payload = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, payload);
      if (!service) {
        return res.status(404).json({ message: "Услуга не найдена" });
      }
      res.json({ service });
    }),
  );

  api.delete(
    "/services/:id",
    asyncHandler(async (req, res) => {
      const removed = await storage.deleteService(req.params.id);
      if (!removed) {
        return res.status(404).json({ message: "Услуга не найдена" });
      }
      res.status(204).send();
    }),
  );

  api.get(
    "/bookings",
    asyncHandler(async (_req, res) => {
      const bookings = await storage.listBookings();
      res.json({ bookings });
    }),
  );

  api.post(
    "/bookings",
    asyncHandler(async (req, res) => {
      const payload = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(payload);
      res.status(201).json({ booking });
    }),
  );

  api.put(
    "/bookings/:id",
    asyncHandler(async (req, res) => {
      const payload = insertBookingSchema.partial().parse(req.body);
      const booking = await storage.updateBooking(req.params.id, payload);
      if (!booking) {
        return res.status(404).json({ message: "Запись не найдена" });
      }
      res.json({ booking });
    }),
  );

  api.patch(
    "/bookings/:id/status",
    asyncHandler(async (req, res) => {
      const { status } = z.object({ status: bookingStatusSchema }).parse(req.body);
      const booking = await storage.updateBookingStatus(req.params.id, status);
      if (!booking) {
        return res.status(404).json({ message: "Запись не найдена" });
      }
      res.json({ booking });
    }),
  );

  api.delete(
    "/bookings/:id",
    asyncHandler(async (req, res) => {
      const removed = await storage.deleteBooking(req.params.id);
      if (!removed) {
        return res.status(404).json({ message: "Запись не найдена" });
      }
      res.status(204).send();
    }),
  );

  api.get(
    "/availability",
    asyncHandler(async (req, res) => {
      const params = z
        .object({
          masterId: z.string().min(1),
          serviceId: z.string().min(1),
          date: z.string().regex(/\d{4}-\d{2}-\d{2}/),
        })
        .parse(req.query);
      const services = await storage.listServices();
      const service = services.find((item) => item.id === params.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Услуга не найдена" });
      }
      const slots = await storage.getAvailableSlots(params.masterId, params.date, service.duration);
      res.json({ slots });
    }),
  );

  api.get(
    "/messages",
    asyncHandler(async (_req, res) => {
      const messages = await storage.listMessages();
      res.json({ messages });
    }),
  );

  api.put(
    "/messages",
    asyncHandler(async (req, res) => {
      const { messages } = z
        .object({
          messages: z.array(botMessageSchema),
        })
        .parse(req.body);
      const saved = await storage.saveMessages(messages);
      res.json({ messages: saved });
    }),
  );

  api.get(
    "/settings",
    asyncHandler(async (_req, res) => {
      const settings = await storage.getSettings();
      res.json({ settings });
    }),
  );

  api.put(
    "/settings",
    asyncHandler(async (req, res) => {
      const payload = settingsSchema.parse(req.body);
      const previousSettings = await storage.getSettings();
      const settings = await storage.saveSettings(payload);

      let botRestarted = false;
      let botAction: BotAction = "none";
      let botRestartMessage: string | undefined;

      if (settings.botToken !== previousSettings.botToken) {
        const result = await botManager.handleTokenChange(previousSettings.botToken, settings.botToken);
        botRestarted = result.triggered;
        botAction = result.action;
        botRestartMessage = result.message;

        if (botRestartMessage) {
          console[result.triggered ? "info" : "warn"](
            `[bot] ${botRestartMessage} (действие: ${botAction})`,
          );
        }
      }

      res.json({ settings, botRestarted, botAction, botRestartMessage });
    }),
  );

  api.use("/portfolio", portfolioRouter);
  api.use("/bot", botRouter);

  api.get(
    "/dashboard",
    asyncHandler(async (_req, res) => {
      const summary = await storage.dashboardSummary();
      res.json(summary);
    }),
  );

  api.post(
    "/excel/import",
    upload.single("file"),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: "Файл не найден" });
      }
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ message: "Лист в файле не найден" });
      }
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      let imported = 0;
      let skipped = 0;

      const masters = await storage.listMasters();
      const services = await storage.listServices();

      for (const row of rows) {
        try {
          const masterName = String(row["Мастер"] || row["master"] || row["Master"] || "").trim();
          const serviceName = String(row["Услуга"] || row["service"] || row["Service"] || "").trim();
          const dateRaw = String(row["Дата"] || row["date"] || row["Date"] || "").trim();
          const time = String(row["Время"] || row["time"] || row["Time"] || "").trim();
          if (!masterName || !serviceName || !dateRaw || !time) {
            skipped++;
            continue;
          }
          let parsedDate: Date | undefined;
          if (dateRaw.includes(".")) {
            const [day, month, year] = dateRaw.split(".");
            parsedDate = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
          } else {
            parsedDate = new Date(dateRaw);
          }

          if (Number.isNaN(parsedDate.getTime())) {
            skipped++;
            continue;
          }

          const date = parsedDate.toISOString().split("T")[0];

          const master = masters.find(
            (item) =>
              item.nickname.toLowerCase() === masterName.toLowerCase() ||
              item.name.toLowerCase() === masterName.toLowerCase(),
          );
          const service = services.find((item) => item.name.toLowerCase() === serviceName.toLowerCase());
          if (!master || !service) {
            skipped++;
            continue;
          }

          const statusRaw = String(row["Статус"] || row["status"] || "pending").toLowerCase();
          const statusMap: Record<string, "pending" | "confirmed" | "cancelled"> = {
            pending: "pending",
            confirmed: "confirmed",
            cancelled: "cancelled",
            "подтверждена": "confirmed",
            "подтверждено": "confirmed",
            "подтвержден": "confirmed",
            "ожидает": "pending",
            "в обработке": "pending",
            "отменена": "cancelled",
            "отменено": "cancelled",
          };

          const normalizedStatus = statusMap[statusRaw] ?? "pending";

          await storage.createBooking({
            clientName: String(row["Клиент"] || row["client"] || row["Client"] || "Гость"),
            clientPhone: String(row["Телефон"] || row["phone"] || row["Phone"] || ""),
            clientTelegram: String(row["Telegram"] || row["tg"] || row["Телеграм"] || "").replace(/^@/, "") || undefined,
            masterId: master.id,
            serviceId: service.id,
            date,
            time,
            status: normalizedStatus,
          });
          imported++;
        } catch (error) {
          skipped++;
        }
      }

      res.json({ imported, skipped });
    }),
  );

  api.get(
    "/excel/export",
    asyncHandler(async (req, res) => {
      const params = z
        .object({
          from: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
          to: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
        })
        .parse(req.query);
      const bookings = await storage.listBookings();
      const filtered = bookings.filter((booking) => {
        if (params.from && booking.date < params.from) return false;
        if (params.to && booking.date > params.to) return false;
        return true;
      });

      const rows = filtered.map((booking) => ({
        Дата: formatDate(booking.date),
        Время: booking.time,
        Мастер: booking.masterName,
        Услуга: booking.service,
        Клиент: booking.clientName,
        Телефон: booking.clientPhone,
        Telegram: booking.clientTelegram ?? "",
        Статус: booking.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Записи");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=bookings.xlsx");
      res.send(buffer);
    }),
  );

  app.use("/api", api);

  const httpServer = createServer(app);

  return httpServer;
}
