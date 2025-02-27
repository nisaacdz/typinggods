import { Request, Response } from "express";
import { getCurrentUser } from "../services/auth";
import { EmailSchema, PasswordSchema, UsernameSchema } from "../../util";
import { AppService } from "../services/index.service";
import { z } from "zod";

export default class UserController {
  constructor(private readonly appService: AppService) {
    this.appService = appService;
  }

  async getUser(req: Request, res: Response) {
    const currentUser = getCurrentUser(req.session);
    if (!currentUser) {
      return res.status(401).send("Unauthorized");
    }
    const username = req.params.username;
    const user = await this.appService.userService.getUserByUsername(username);
    if (!user || user.userId !== currentUser.userId) {
      return res.status(404).send("User not found");
    }
    const stats = await this.appService.userService.getUserStats(user.userId);
    return res.json({ user, stats });
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
    try {
      const [updateKey] = Object.keys(updateData);
      if (updateKey === "username") {
        const { username } = UsernameSchema.parse(updateData);
        updatedUser = await this.appService.userService.updateUsername(
          user.userId,
          {
            username,
          },
        );
      } else if (updateKey === "email") {
        const { email } = EmailSchema.parse(updateData);
        updatedUser = await this.appService.userService.updateEmail(
          user.userId,
          {
            email,
          },
        );
      } else if (updateKey === "password") {
        const { password } = PasswordSchema.parse(updateData);
        updatedUser = await this.appService.userService.updatePassword(
          user.userId,
          {
            password,
          },
        );
      } else {
        return res.status(400).send("Invalid data");
      }
      return res.status(200).send(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors);
      }
      return res.status(500).send("Internal Server Error");
    }
  }

  async getUserChallenges(req: Request, res: Response) {
    const userId = req.params.userId;

    try {
      const challenges =
        await this.appService.challengeService.getUserChallenges(
          req.query as any,
          userId,
        );
      return res.status(200).send(challenges);
    } catch (error) {
      return res.status(500).send("Internal Server Error");
    }
  }
}
