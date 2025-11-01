// server/routes.stats.ts
import type { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { getStorage } from "./storage";

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

function safeReadJSON(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

export function attachStatsRoutes(api: Router) {
  api.get("/stats", wrap(async (_req, res) => {
    const storage = getStorage();
    const [masters, services, bookings] = await Promise.all([
      storage.listMasters(),
      storage.listServices(),
      storage.listBookings(),
    ]);

    const todayISO = new Date().toISOString().slice(0,10);
    const in7 = new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10);

    const totalBookings = (bookings || []).length;
    const todayBookings = (bookings || []).filter((b: any) => String(b.date) === todayISO).length;
    const upcoming7d = (bookings || []).filter((b: any) => {
      const d = String(b.date || "");
      return d >= todayISO && d <= in7 && (b.status || "").toLowerCase() !== "cancelled";
    }).length;

    const clientsFile = path.join(process.cwd(), "data", "clients.json");
    const clients = safeReadJSON(clientsFile, []);
    const certsFile = path.join(process.cwd(), "data", "certs.json");
    const certs = safeReadJSON(certsFile, []);
    const portfolioDir = path.join(process.cwd(), "uploads", "portfolio");
    let portfolioCount = 0;
    try { portfolioCount = fs.readdirSync(portfolioDir).length; } catch {}

    res.json({
      totalMasters: (masters || []).length,
      totalServices: (services || []).length,
      totalBookings,
      todayBookings,
      upcoming7d,
      totalClients: (clients || []).length,
      portfolioCount,
      certsCount: (certs || []).length,
    });
  }));
}
