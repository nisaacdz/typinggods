import { Express } from "express";

import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";

export function initializeRoutes(app: Express) {
  app.get("/status", (_, res) => {
    res.status(200).json({ status: "OK" });
  });

  app.use("/auth", authRoutes);
  app.use("/user", userRoutes);
}
