import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import {
  type User,
  type TypingSession,
  UsersTable,
  UserStatsTable,
  NewUser,
} from "../db/schema/db.schema";
import { DatabaseError, NotFoundError, ConflictError } from "../errors";
import bcrypt from "bcrypt";

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
          "User with this email or username already exists"
        );
      }
      throw new DatabaseError("Failed to create user");
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.userId, userId))
      .limit(1);

    return user ?? null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.username, username))
      .limit(1);
    return user || null;
  }

  // async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
  //   const [user] = await this.db
  //     .update(UsersTable)
  //     .set(updateData)
  //     .where(eq(UsersTable.userId, userId))
  //     .returning();

  //   if (!user) throw new NotFoundError("User not found");
  //   return user;
  // }

  async deleteUser(userId: string): Promise<void> {
    await this.db.delete(UsersTable).where(eq(UsersTable.userId, userId));
  }

  private async unsafeUpdate(userId: string, data: Partial<User>) {
    const [user] = await this.db
      .update(UsersTable)
      .set(data)
      .where(eq(UsersTable.userId, userId))
      .returning();

    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  // Public facing methods
  async updateUsername(userId: string, data: { username: string }) {
    // Check username uniqueness
    const [existingUser] = await this.db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.username, data.username))
      .limit(1);

    if (existingUser) {
      throw new ConflictError("Username already taken");
    }

    return this.unsafeUpdate(userId, { username: data.username });
  }

  async updateEmail(userId: string, data: { email: string }) {
    // Add future email verification logic here
    return this.unsafeUpdate(userId, { email: data.email });
  }

  async updatePassword(userId: string, data: { password: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.unsafeUpdate(userId, { password: hashedPassword });
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
