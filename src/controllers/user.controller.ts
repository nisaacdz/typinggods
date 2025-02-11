import { Request, Response } from "express";
import { NewUser } from "../db/schema/db.schema";
import { UserService } from "../services/user.service";

export default class UserController {
  constructor(private readonly userService: UserService) {
    this.userService = userService;
  }

  async getUser(req: Request, res: Response) {
    const userId = req.params.id;
    const user = this.userService.getUserById(userId);
    return res.json(user);
  }

  async createUser(req: Request, res: Response) {
    const userData = req.body as NewUser;
    const user = this.userService.createUser(userData);
    return res.json(user);
  }

  async updateUser(req: Request, res: Response) {
    const userId = req.params.id;
    const updateData = req.body;
    const user = this.userService.updateUser(userId, updateData);
    return res.json(user);
  }
}
