import { UserService } from "./user.service";
import { ChallengeService } from "./challenge.service";
import { TypingService } from "./typing.service";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

export class AppService {
  public userService: UserService;
  public challengeService: ChallengeService;
  public typingService: TypingService;

  constructor(private readonly db: NodePgDatabase) {
    this.userService = new UserService(db);
    this.challengeService = new ChallengeService(db);
    this.typingService = new TypingService(db);
  }
}
