import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import {
  type User,
  type TypingSession,
  UsersTable,
  UserStatsTable,
  NewUser,
} from "../db/schema/db.schema";
import { DatabaseError, NotFoundError, ConflictError } from "../errors";

export class UserService {
  constructor(private readonly db: NodePgDatabase) {}

  async createUser(userData: NewUser): Promise<User> {
    try {
      const [user] = await this.db
        .insert(UsersTable)
        .values(userData)
        .returning();
      return user;
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        throw new ConflictError(
          "User with this email or username already exists",
        );
      }
      throw new DatabaseError("Failed to create user");
    }
  }

  async getUserById(userId: string): Promise<User> {
    const [user] = await this.db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.userId, userId))
      .limit(1);

    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const [user] = await this.db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    const [user] = await this.db
      .update(UsersTable)
      .set(updateData)
      .where(eq(UsersTable.userId, userId))
      .returning();

    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.db.delete(UsersTable).where(eq(UsersTable.userId, userId));
  }
}

export class UserStatsService {
  constructor(private readonly db: NodePgDatabase) {}

  async getStats(userId: string) {
    const [stats] = await this.db
      .select()
      .from(UserStatsTable)
      .where(eq(UserStatsTable.userId, userId))
      .limit(1);

    if (!stats) throw new NotFoundError("User stats not found");
    return stats;
  }

  async updateStats(session: TypingSession) {
    // Update stats only if the session has ended
    // todo: will need to study the logic here
  }
}
