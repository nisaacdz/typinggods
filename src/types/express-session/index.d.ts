import { LocalUser } from "../../db/schema/db.schema";
import { Session, SessionData } from "express-session";

declare module "express-session" {
  interface SessionData {
    user?: LocalUser;
  }
}

declare module "http" {
  interface IncomingMessage {
    session?: Session & Partial<SessionData>;
  }
}
