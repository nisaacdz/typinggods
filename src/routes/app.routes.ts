import { Express } from "express";
import UserRoutes from "./user.routes";
import { AppService } from "../services/index.service";
import ChallengeRoutes from "./challenge.routes";

export function initializeRoutes(app: Express, appService: AppService) {
  app.get("/status", (_, res) => {
    res.status(200).json({ status: "OK" });
  });

  const userRoutes = new UserRoutes(appService.userService);
  const challengeRoutes = new ChallengeRoutes(appService.challengeService);

  app.use("/user", userRoutes.getRouter());
  app.use("/challenges", challengeRoutes.getRouter());
}
