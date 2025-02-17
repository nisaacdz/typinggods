import { Router } from "express";
import TypingController from "../controllers/typing.controller";
import { TypingService } from "../services/typing.service";

export default class TypingRoutes {
  private router: Router;
  private controller: TypingController;
  constructor(readonly typingService: TypingService) {
    this.router = Router();
    this.controller = new TypingController(typingService);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/:challengeId/:userId",
      this.controller.getTypingSession.bind(this.controller),
    );
  }

  getRouter() {
    return this.router;
  }
}
