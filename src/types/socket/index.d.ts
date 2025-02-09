import { User } from "../../db/schema/db.schema";

declare module "socket.io" {
  interface Socket {
    user?: User;
  }
}
