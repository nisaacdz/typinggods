import express from "express";
import { login, signup } from "../services/auth";
import { z } from "zod";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Invalid username or password");
  }
  const user = await login(username, password);
  if (!user) {
    return res.status(401).send("Could not log in");
  }
  if (req.session) {
    req.session.user = user;
  } else {
    return res.status(500).send("Something went wrong");
  }
  return res.status(200).send(user);
});

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await signup(email, password);
    if (!user) {
      throw new Error("Unknown Error");
    }
    if (req.session) {
      req.session.user = user;
    } else {
      return res.status(500).send("Something went wrong");
    }
    res.status(200).send(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).send(error.format());
    }
    return res
      .status(500)
      .json((error as Error).message || "Something went wrong");
  }
});

router.post("/logout", (req, res) => {
  req.session?.destroy(() => {
    res.status(200).send("Logged out");
  });
});

export default router;
