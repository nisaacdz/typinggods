import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ChallengeMetaSchema, UserChallengeMetaSchema } from "./zod";

export const getUserChallengesBodyValidator = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsedQuery = UserChallengeMetaSchema.parse(req.query);
    req.query = parsedQuery as any;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).send(error.errors);
    }
    return res.status(500).send("Internal Server Error");
  }
};

export const getChallengesBodyValidator = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsedQuery = ChallengeMetaSchema.parse(req.query);
    req.query = parsedQuery as any;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).send(error.errors);
    }
    return res.status(500).send("Internal Server Error");
  }
};
