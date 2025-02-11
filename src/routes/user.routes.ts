import { Router } from "express";
import UserController from "../controllers/user.controller";
import { AppService } from "../services/index.service";
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
        this.router.get("/:id", this.controller.getUser.bind(this.controller));
        this.router.post("/", this.controller.createUser.bind(this.controller));
        this.router.put("/:id", this.controller.updateUser.bind(this.controller));

        // Add more routes here
    }
    
    getRouter() {
        return this.router;
    }
}
