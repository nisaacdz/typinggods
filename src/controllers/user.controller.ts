import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { getCurrentUser } from "../services/auth";
import { EmailSchema, PasswordSchema, UsernameSchema } from "../util";

export default class UserController {
  constructor(private readonly userService: UserService) {
    this.userService = userService;
  }

  async getUser(req: Request, res: Response) {
    const username = req.params.username;
    const user = await this.userService.getUserByUsername(username);
    return res.json(user);
  }

  async getAuthenticatedUser(req: Request, res: Response) {
    const user = getCurrentUser(req.session) || null;
    return res.status(200).send(user);
  }

  async updateUser(req: Request, res: Response) {
    const user = getCurrentUser(req.session);
    const username = req.params.username;
    if (!user || user.username != username) {
      return res.status(401).send("Unauthorized");
    }
    const updateData = req.body;
    if (
      typeof updateData !== "object" ||
      Object.keys(updateData).length !== 1
    ) {
      return res.status(400).send("Invalid data");
    }

    let updatedUser;
    const [updateKey] = Object.keys(updateData);
    if (updateKey === "username") {
      const { username } = UsernameSchema.parse(updateData);
      updatedUser = await this.userService.updateUsername(user.userId, {
        username,
      });
    } else if (updateKey === "email") {
      const { email } = EmailSchema.parse(updateData);
      updatedUser = await this.userService.updateEmail(user.userId, { email });
    } else if (updateKey === "password") {
      const { password } = PasswordSchema.parse(updateData);
      updatedUser = await this.userService.updatePassword(user.userId, {
        password,
      });
    } else {
      return res.status(400).send("Invalid data");
    }
    return res.status(200).send(updatedUser);
  }
}
