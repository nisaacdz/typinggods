import { Express } from "express";

import express from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";

class AppRoutes {
  app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  initializeRoutes() {
    this.app.get("/status", (_, res) => {
      res.status(200).json({ status: "OK" });
    });

    this.app.use("/auth", authRoutes);
    this.app.use("/user", userRoutes);
  }
}

export default AppRoutes;
