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
import { db } from "../db";

export default class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {
    this.challengeService = challengeService;
  }

  async createChallenge(req: Request, res: Response) {
    const user = getCurrentUser(req.session);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const { privacy, scheduledAt, duration } = req.body;

    const text = generateTypingText();

    const newChallenge: NewChallenge = {
      privacy,
      createdBy: user.userId,
      text,
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
      user = await login("password", "username");
      //return res.status(401).send("Unauthorized");
    }

    user = user!;

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
      user = await login("password", "username");
      //return res.status(401).send("Unauthorized");
    }
    user = user!;
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
    const totalChallenges = await this.challengeService.getTotalChallenges();
    const totalPages = Math.ceil(totalChallenges / pageSize);

    return res.status(200).send({ challenges, totalPages });
  }

  async getChallengeText(req: Request, res: Response) {
    // const user = getCurrentUser(req.session);
    // if (!user) {
    //   return res.status(401).send("Unauthorized");
    // }

    const challengeId = req.params.id;
    const challenge = await this.challengeService.getChallengeById(challengeId);

    if (!challenge) {
      return res.status(404).send("Challenge not found");
    }

    // if (challenge.privacy === ChallengePrivacy.Invitational) {
    //   const userChallenge = await this.challengeService.getUserChallenge(
    //     user.userId,
    //     challengeId,
    //   );
    //   if (!userChallenge) {
    //     return res.status(403).send("Unauthorized");
    //   }
    // }

    return res.status(200).send({ text: challenge.text });
  }
}
