import { Router } from "express";
import ChallengeController from "../controllers/challenge.controller";
import { ChallengeService } from "../services/challenge.service";
import { getChallengesBodyValidator } from "../middleware/zodValidators";

export default class ChallengeRoutes {
  private router: Router;
  private controller: ChallengeController;
  constructor(readonly challengeService: ChallengeService) {
    this.router = Router();
    this.controller = new ChallengeController(challengeService);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/",
      getChallengesBodyValidator,
      this.controller.getChallenges.bind(this.controller),
    );
    this.router.get("/:id", this.controller.getChallenge.bind(this.controller));
    this.router.get(
      "/:id/text",
      this.controller.getChallengeText.bind(this.controller),
    );
    this.router.get(
      "/:id/participants",
      this.controller.getParticipants.bind(this.controller),
    );
    this.router.patch(
      "/:id/enter",
      this.controller.enterChallenge.bind(this.controller),
    );
    this.router.post(
      "/",
      this.controller.createChallenge.bind(this.controller),
    );
  }

  getRouter() {
    return this.router;
  }
}
