import { Request, Response } from "express";
import { register, login } from "../services/auth.service";
import { z } from "zod";

// body validation with Email and Password using zod
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerUser = (req: Request, res: Response) => {
  const { email, password } = registerSchema.parse(req.body);
  const user = register(email, password);
  return res.json(user);
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginUser = (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = login(email, password);
  return res.json(user);
};
