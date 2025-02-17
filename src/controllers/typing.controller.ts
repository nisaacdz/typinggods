import { Request, Response } from "express";
import { TypingService } from "../services/typing.service";

export default class TypingController {
  constructor(private readonly typingService: TypingService) {
    this.typingService = typingService;
  }

  async getTypingSession(req: Request, res: Response) {
    const { challengeId, userId } = req.params;

    const session = await this.typingService.getTypingSession(
      challengeId,
      userId,
    );

    return res.status(200).send(session);
  }
}
