import { Request, Response } from "express";
import {
  ChallengePrivacy,
  ListedChallenge,
  NewChallenge,
} from "../db/schema/db.schema";
import { DefaultPage, DefaultPageSize } from "../util";
import { getCurrentUser, login } from "../services/auth";
import { ChallengeService } from "../services/challenge.service";
import { generateTypingText } from "../services/text";

export default class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {
    this.challengeService = challengeService;
  }

  async createChallenge(req: Request, res: Response) {
    const user = getCurrentUser(req.session);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const { privacy, scheduledTime, duration } = req.body;

    const text = generateTypingText();

    const newChallenge: NewChallenge = {
      privacy,
      createdBy: user.userId,
      text,
      scheduledTime,
      duration,
    };

    const createdChallenge =
      await this.challengeService.createChallenge(newChallenge);

    if (!createdChallenge) {
      return res.status(500).send("Failed to create challenge");
    }

    return res.status(201).send({ challenge: createdChallenge });
  }

  async getChallenge(req: Request, res: Response) {
    const user = getCurrentUser(req.session);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const challengeId = req.params.id;
    const challenge = await this.challengeService.getChallengeById(challengeId);

    if (!challenge) {
      return res.status(404).send("Challenge not found");
    }

    if (challenge.privacy === ChallengePrivacy.Invitational) {
      const userChallenge = await this.challengeService.getUserChallenge(
        user.userId,
        challengeId,
      );
      if (!userChallenge) {
        return res.status(403).send("Unauthorized");
      }
    }

    return res.status(200).send(challenge);
  }

  async getChallenges(req: Request, res: Response) {
    if (!req.session!.user) {
      req.session!.user = await login("password", "username")!;
      //return res.status(401).send("Unauthorized");
    }

    const user = getCurrentUser(req.session);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const page = req.query.page
      ? parseInt(req.query.page as string)
      : DefaultPage;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : DefaultPageSize;

    const challenges = await this.challengeService.getChallenges(
      page,
      pageSize,
    );
  }

  async getChallengeText(req: Request, res: Response) {
    const user = getCurrentUser(req.session);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const challengeId = req.params.id;
    const challenge = await this.challengeService.getChallengeById(challengeId);

    if (!challenge) {
      return res.status(404).send("Challenge not found");
    }

    if (challenge.privacy === ChallengePrivacy.Invitational) {
      const userChallenge = await this.challengeService.getUserChallenge(
        user.userId,
        challengeId,
      );
      if (!userChallenge) {
        return res.status(403).send("Unauthorized");
      }
    }

    return res.status(200).send({ text: challenge.text });
  }
}
