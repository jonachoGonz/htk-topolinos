import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import availabilityRoutes from "./routes/availability";
import bookingRoutes from "./routes/bookings";
import planRoutes from "./routes/plans";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // HTK Center API routes
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/plans", planRoutes);

  return app;
}
