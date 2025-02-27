import { Router } from "express";
import UserController from "../controllers/user.controller";
import { UserService } from "../services/user.service";

export default class UserRoutes {
  private router: Router;
  private controller: UserController;
  constructor(readonly userService: UserService) {
    this.router = Router();
    this.controller = new UserController(userService);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/:username", this.controller.getUser.bind(this.controller));
    this.router.patch("/:username", this.controller.updateUser.bind(this.controller));
  }

  getRouter() {
    return this.router;
  }
}
