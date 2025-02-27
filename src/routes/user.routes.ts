import { Router } from "express";
import UserController from "../controllers/user.controller";
import { AppService } from "../services/index.service";
import { getUserChallengesBodyValidator } from "../middleware/zodValidators";

export default class UserRoutes {
  private router: Router;
  private controller: UserController;
  constructor(readonly appService: AppService) {
    this.router = Router();
    this.controller = new UserController(appService);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/:username",
      this.controller.getUser.bind(this.controller),
    );
    this.router.patch(
      "/:username",
      this.controller.updateUser.bind(this.controller),
    );
    this.router.get(
      "/:userId/challenges",
      getUserChallengesBodyValidator,
      this.controller.getUserChallenges.bind(this.controller),
    );
  }

  getRouter() {
    return this.router;
  }
}
