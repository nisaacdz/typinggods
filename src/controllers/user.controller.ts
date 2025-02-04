import { Request, Response } from "express";
import * as UserService from "../services/user.service";

export const getUsers = (req: Request, res: Response) => {
  const users = UserService.searchUsers(req);
  return res.json(users);
};

export const getUser = (req: Request, res: Response) => {
  const userId = req.params.id;
  const user = UserService.getUserById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(user);
};
