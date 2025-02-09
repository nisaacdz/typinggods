import { UserService } from "./user.service";
import { ChallengeService } from "./challenge.service";
import { TypingService } from "./typing.service";
import { TextService } from "./text.service";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

export class AppService {
  userService: UserService;
  challengeService: ChallengeService;
  typingService: TypingService;
  textService: TextService;

  constructor(private readonly db: NodePgDatabase) {
    this.userService = new UserService(db);
    this.challengeService = new ChallengeService(db);
    this.typingService = new TypingService(db);
    this.textService = new TextService();
  }
}
