import { Request, Response } from "express";
import {
  ChallengePrivacy,
  ListedChallenge,
  NewChallenge,
} from "../db/schema/db.schema";
import { DefaultPage, DefaultPageSize } from "../../util";
import { getCurrentUser } from "../services/auth";
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

    const { privacy, scheduledAt, duration, title } = req.body;

    const text = generateTypingText();

    const newChallenge: NewChallenge = {
      privacy,
      createdBy: user.userId,
      text,
      challengeTitle: title,
      scheduledAt,
      duration,
    };

    const createdChallenge =
      await this.challengeService.createChallenge(newChallenge);

    if (!createdChallenge) {
      return res.status(500).send("Failed to create challenge");
    }

    return res.status(201).send({ challenge: createdChallenge });
  }

  async getParticipants(req: Request, res: Response) {
    const challengeId = req.params.id;

    const participants =
      await this.challengeService.getChallengeParticipants(challengeId);

    return res.status(200).send(participants);
  }

  async getChallenge(req: Request, res: Response) {
    let user = getCurrentUser(req.session);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const challengeId = req.params.id;
    const challenge = await this.challengeService.getChallengeById(challengeId);

    if (!challenge) {
      return res.status(404).send("Challenge not found");
    }

    if (challenge.privacy === ChallengePrivacy.Invitational) {
      const userChallenge = await this.challengeService.getUserChallengeByIds(
        user.userId,
        challengeId,
      );
      if (!userChallenge) {
        return res.status(403).send("Unauthorized");
      }
    }

    return res.status(200).send(challenge);
  }

  async enterChallenge(req: Request, res: Response) {
    const challengeId = req.params.id;
    let user = getCurrentUser(req.session);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }
    const challenge = await this.challengeService.getChallengeById(challengeId);

    if (!challenge) {
      return res.status(404).send("Challenge does not exist");
    }

    let userChallenge;

    switch (challenge.privacy) {
      case ChallengePrivacy.Open:
        userChallenge = await this.challengeService.enterPublicChallenge(
          user.userId,
          challengeId,
        );
        break;
      case ChallengePrivacy.Invitational:
        userChallenge = await this.challengeService.enterInvitationalChallenge(
          challengeId,
          user.userId,
        );
        break;
      default:
      // do nothing for now but maybe in the future we might extend this functionality
    }

    if (!userChallenge) {
      return res.status(403).send("Unable to enter challenge");
    }

    return res.status(200).send(userChallenge);
  }

  async getChallenges(req: Request, res: Response) {
    const user = getCurrentUser(req.session);
    try {
      const challenges = await this.challengeService.getChallenges(
        req.query as any,
        user?.userId,
      );
      return res.status(200).send(challenges);
    } catch (error) {
      console.error(error);
      return res.status(500).send("Internal Server Error");
    }
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
      const userChallenge = await this.challengeService.getUserChallengeByIds(
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
