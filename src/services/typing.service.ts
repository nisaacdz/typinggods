import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, not, isNotNull, getTableColumns } from "drizzle-orm";
import {
  ChallengesTable,
  type TypingSession,
  TypingSessionsTable,
  UsersTable,
} from "../db/schema/db.schema";
import { NotFoundError } from "../errors";

export type TypingParticipant = {
  userId: string;
  currentPosition: number;
  speed: number | null;
  accuracy: number | null;
};

export class TypingService {
  constructor(private readonly db: NodePgDatabase) {}

  async getOrCreateTypingSession(
    userId: string,
    challengeId: string,
  ): Promise<TypingSession> {
    return this.db.transaction(async (tx) => {
      // Check for existing active session
      const [existingSession] = await tx
        .select()
        .from(TypingSessionsTable)
        .where(
          and(
            eq(TypingSessionsTable.userId, userId),
            eq(TypingSessionsTable.challengeId, challengeId),
          ),
        )
        .limit(1);

      if (existingSession) {
        return existingSession;
      }

      const [session] = await tx
        .insert(TypingSessionsTable)
        .values({
          userId,
          challengeId,
        })
        .returning();

      return session ?? null;
    });
  }

  async getTypingSession(challengeId: string, userId: string) {
    const [session] = await this.db
      .select()
      .from(TypingSessionsTable)
      .where(
        and(
          eq(TypingSessionsTable.userId, userId),
          eq(TypingSessionsTable.challengeId, challengeId),
        ),
      )
      .limit(1);
    return session ?? null;
  }

  async getTypingSessionWithUsername(challengeId: string, userId: string) {
    const [session] = await this.db
      .select({
        ...getTableColumns(TypingSessionsTable),
        username: UsersTable.username,
      })
      .from(TypingSessionsTable)
      .innerJoin(UsersTable, eq(TypingSessionsTable.userId, UsersTable.userId))
      .where(
        and(
          eq(TypingSessionsTable.userId, userId),
          eq(TypingSessionsTable.challengeId, challengeId),
        ),
      )
      .limit(1);
    return session ?? null;
  }

  async updateSessionProgress(
    sessionId: string,
    update: Partial<TypingSession>,
  ): Promise<TypingSession> {
    const [session] = await this.db
      .update(TypingSessionsTable)
      .set(update)
      .where(eq(TypingSessionsTable.sessionId, sessionId))
      .returning();

    if (!session) throw new NotFoundError("Session not found");
    return session;
  }

  async deleteTypingSession(sessionId: string): Promise<TypingSession> {
    const [session] = await this.db
      .delete(TypingSessionsTable)
      .where(eq(TypingSessionsTable.sessionId, sessionId))
      .returning();

    return session || null;
  }

  async getActiveSession(userId: string): Promise<TypingSession | null> {
    const [session] = await this.db
      .select()
      .from(TypingSessionsTable)
      .where(
        and(
          eq(TypingSessionsTable.userId, userId),
          not(isNotNull(TypingSessionsTable.endTime)),
        ),
      )
      .limit(1);

    return session || null;
  }

  async getChallengeParticipants(
    challengeId: string,
  ): Promise<TypingParticipant[]> {
    return this.db
      .select({
        userId: TypingSessionsTable.userId,
        currentPosition: TypingSessionsTable.currentPosition,
        speed: TypingSessionsTable.wpm,
        accuracy: TypingSessionsTable.accuracy,
      })
      .from(TypingSessionsTable)
      .where(eq(TypingSessionsTable.challengeId, challengeId));
  }
}
