import { Express } from "express";
import UserRoutes from "./user.routes";
import { AppService } from "../services/index.service";
import ChallengeRoutes from "./challenge.routes";
import TypingRoutes from "./typing.routes";
import UserController from "../controllers/user.controller";

export function initializeRoutes(app: Express, appService: AppService) {
  app.get("/status", (_, res) => {
    res.status(200).json({ status: "OK" });
  });

  const userRoutes = new UserRoutes(appService);
  const challengeRoutes = new ChallengeRoutes(appService.challengeService);
  const typingSessionRoutes = new TypingRoutes(appService.typingService);

  app.use("/users", userRoutes.getRouter());
  app.use("/challenges", challengeRoutes.getRouter());
  app.use("/typingsessions", typingSessionRoutes.getRouter());
}
