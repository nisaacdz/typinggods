import { Request, Response } from "express";
import { NewUser } from "../db/schema/db.schema";
import { UserService } from "../services/user.service";
import { getCurrentUser } from "../services/auth";

export default class UserController {
  constructor(private readonly userService: UserService) {
    this.userService = userService;
  }

  async getUser(req: Request, res: Response) {
    const userId = req.params.id;
    const user = this.userService.getUserById(userId);
    return res.json(user);
  }

  async getAuthenticatedUser(req: Request, res: Response) {
    const user = getCurrentUser(req.session) || null;
    return res.status(200).send(user);
  }

  async updateUser(req: Request, res: Response) {
    const userId = req.params.id;
    const updateData = req.body;
    const user = this.userService.updateUser(userId, updateData);
    return res.json(user);
  }
}
