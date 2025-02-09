import { Request, Response } from "express";
import {
  ChallengePrivacy,
  ListedChallenge,
  NewChallenge,
  UserChallengeStatus,
} from "../db/schema/db.schema";
import {
  getCurrentUser,
  getCurrentUserFromRequest,
  getToken,
} from "../services/auth.service";
import { AppService } from "../services/index.service";
import { DefaultPage, DefaultPageSize } from "../util";

export class ChallengeController {
  constructor(private readonly appService: AppService) {}

  async createChallenge(req: Request, res: Response) {
    const token = getToken(req);
    if (!token) {
      return res.status(401).send("Unauthorized");
    }
    const user = getCurrentUser(token);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const { privacy, scheduledTime, duration } = req.body;

    const text = this.appService.textService.generateTypingText();

    const newChallenge: NewChallenge = {
      privacy,
      createdBy: user.userId,
      text,
      scheduledTime,
      duration,
    };

    const createdChallenge =
      await this.appService.challengeService.createChallenge(newChallenge);

    if (!createdChallenge) {
      return res.status(500).send("Failed to create challenge");
    }

    return res.status(201).send({ challenge: createdChallenge });
  }

  async getChallenge(req: Request, res: Response) {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const challengeId = req.params.id;
    const challenge =
      await this.appService.challengeService.getChallengeById(challengeId);

    if (!challenge) {
      return res.status(404).send("Challenge not found");
    }

    if (challenge.privacy === ChallengePrivacy.Invitational) {
      const userChallenge =
        await this.appService.challengeService.getUserChallenge(
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
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const page = req.query.page
      ? parseInt(req.query.page as string)
      : DefaultPage;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : DefaultPageSize;

    // First look for all Invitational challenges that the user is a part of (Paginate)
    const invitationalChallenges =
      await this.appService.challengeService.getInvitedChallenges(
        user.userId,
        page,
        pageSize,
      );
    let remainingLimit = pageSize - invitationalChallenges.length;
    let publicChallenges: ListedChallenge[] = [];

    // Then look for all Open challenges (if pagination is not complete)
    if (remainingLimit > 0) {
      publicChallenges =
        await this.appService.challengeService.getPublicChallenges(
          remainingLimit,
        );
    }

    const challenges = invitationalChallenges.concat(publicChallenges);
    return res.status(200).send(challenges);
  }
}
