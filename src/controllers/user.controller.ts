import { Request, Response } from "express";
import { getUserById, searchUsers } from "../services/user.service";

export const getUsers = (req: Request, res: Response) => {
  const users = searchUsers(req);
  return res.json(users);
};

export const getUser = (req: Request, res: Response) => {
  const userId = req.params.id;
  const user = getUserById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(user);
};
