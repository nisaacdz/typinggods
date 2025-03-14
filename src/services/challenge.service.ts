import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  eq,
  or,
  and,
  sql,
  inArray,
  count,
  gt,
  getTableColumns,
  asc,
  ilike,
} from "drizzle-orm";
import {
  type Challenge,
  type NewChallenge,
  type UserChallenge,
  ChallengePrivacy,
  ChallengesTable,
  CreatedChallenge,
  ListedChallenge,
  TypingSessionsTable,
  UserChallengesTable,
  UserChallengeStatus,
  UserChallengeStatusType,
  UsersTable,
} from "../db/schema/db.schema";

import { NotFoundError } from "../errors";
import {
  ChallengeFilter,
  Meta,
  PaginatedData,
  UserChallengeFilter,
} from "../../util";

const CreatedChallengeSelection = {
  challengeId: ChallengesTable.challengeId,
  challengeTitle: ChallengesTable.challengeTitle,
  createdBy: ChallengesTable.createdBy,
  createdAt: ChallengesTable.createdAt,
  scheduledAt: ChallengesTable.scheduledAt,
  startedAt: ChallengesTable.startedAt,
  privacy: ChallengesTable.privacy,
  duration: ChallengesTable.duration,
};

const ListedChallengeSelection = {
  challengeId: ChallengesTable.challengeId,
  challengeTitle: ChallengesTable.challengeTitle,
  createdBy: {
    userId: UsersTable.userId,
    username: UsersTable.username,
    email: UsersTable.email,
  },
  createdAt: ChallengesTable.createdAt,
  scheduledAt: ChallengesTable.scheduledAt,
  startedAt: ChallengesTable.startedAt,
  privacy: ChallengesTable.privacy,
  duration: ChallengesTable.duration,
};

export class ChallengeService {
  challengeClosedWindow = 10 * 1000;
  constructor(private readonly db: NodePgDatabase) {}

  async createChallenge(
    challengeData: NewChallenge,
  ): Promise<CreatedChallenge> {
    const [challenge] = await this.db
      .insert(ChallengesTable)
      .values(challengeData)
      .returning(CreatedChallengeSelection);
    return challenge;
  }

  async getChallengeById(challengeId: string): Promise<Challenge> {
    const [challenge] = await this.db
      .select()
      .from(ChallengesTable)
      .where(eq(ChallengesTable.challengeId, challengeId))
      .limit(1);
    return challenge ?? null;
  }

  async getChallenges(
    { page, pageSize, filter }: Meta<ChallengeFilter>,
    userId?: string,
  ): Promise<PaginatedData<ListedChallenge>> {
    // In the future we may need to change implemenations based on whether the user is logged in
    // probably show the challenges in the order: created by user, joined by user, open challenges
    const offset = (page - 1) * pageSize;

    const conditions = [
      filter?.privacy ? eq(ChallengesTable.privacy, filter.privacy) : undefined,
      filter?.search
        ? or(
            ilike(UsersTable.username, `%${filter.search}%`),
            ilike(ChallengesTable.challengeTitle, `%${filter.search}%`),
          )
        : undefined,
    ].filter(Boolean);

    const [totalItemsResult] = await this.db
      .select({ count: count() })
      .from(ChallengesTable)
      .where(and(...conditions));

    const totalItems = totalItemsResult.count;
    const totalPages = Math.ceil(totalItems / pageSize);

    const data = await this.db
      .select({
        ...ListedChallengeSelection,
        createdBy: {
          userId: UsersTable.userId,
          username: UsersTable.username,
          email: UsersTable.email,
        },
        participants: count(
          and(
            eq(UserChallengesTable.challengeId, ChallengesTable.challengeId),
            eq(UserChallengesTable.challengeId, ChallengesTable.challengeId),
          ),
        ).as("participants"),
      })
      .from(ChallengesTable)
      .innerJoin(UsersTable, eq(ChallengesTable.createdBy, UsersTable.userId))
      .leftJoin(
        UserChallengesTable,
        eq(ChallengesTable.challengeId, UserChallengesTable.challengeId),
      )
      .where(and(...conditions))
      .groupBy(ChallengesTable.challengeId, UsersTable.userId)
      .orderBy(asc(ChallengesTable.scheduledAt))
      .limit(pageSize)
      .offset(offset);

    return {
      page,
      pageSize,
      totalPages,
      totalItems,
      data,
    };
  }

  async getUserChallengeByIds(
    userId: string,
    challengeId: string,
  ): Promise<UserChallenge | null> {
    const [userChallenge] = await this.db
      .select()
      .from(UserChallengesTable)
      .where(
        and(
          eq(UserChallengesTable.userId, userId),
          eq(UserChallengesTable.challengeId, challengeId),
        ),
      )
      .limit(1);

    return userChallenge ?? null;
  }

  async getUserChallenges(
    { page, pageSize, filter }: Meta<UserChallengeFilter>,
    userId: string,
  ): Promise<PaginatedData<UserChallenge>> {
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(UserChallengesTable.userId, userId),
      filter?.status
        ? eq(UserChallengesTable.status, filter.status)
        : undefined,
      filter?.privacy ? eq(ChallengesTable.privacy, filter.privacy) : undefined,
      filter?.search
        ? or(
            ilike(UsersTable.username, `%${filter.search}%`),
            ilike(ChallengesTable.challengeTitle, `%${filter.search}%`),
          )
        : undefined,
    ].filter(Boolean);

    const [totalItemsResult] = await this.db
      .select({ count: count() })
      .from(UserChallengesTable)
      .innerJoin(
        ChallengesTable,
        eq(UserChallengesTable.challengeId, ChallengesTable.challengeId),
      )
      .where(and(...conditions));

    const totalItems = totalItemsResult.count;
    const totalPages = Math.ceil(totalItems / pageSize);

    const data = await this.db
      .select({
        userId: UserChallengesTable.userId,
        challengeId: UserChallengesTable.challengeId,
        status: UserChallengesTable.status,
        joinedAt: UserChallengesTable.joinedAt,
        completedAt: UserChallengesTable.completedAt,
        challengeTitle: ChallengesTable.challengeTitle,
        privacy: ChallengesTable.privacy,
        scheduledAt: ChallengesTable.scheduledAt,
        startedAt: ChallengesTable.startedAt,
        duration: ChallengesTable.duration,
        username: UsersTable.username,
        email: UsersTable.email,
      })
      .from(UserChallengesTable)
      .innerJoin(
        ChallengesTable,
        eq(UserChallengesTable.challengeId, ChallengesTable.challengeId),
      )
      .innerJoin(UsersTable, eq(UserChallengesTable.userId, UsersTable.userId))
      .where(and(...conditions))
      .orderBy(sql`${UserChallengesTable.joinedAt} DESC`)
      .limit(pageSize)
      .offset(offset);

    return {
      page,
      pageSize,
      totalPages,
      totalItems,
      data,
    };
  }

  async getActiveChallenges(): Promise<Challenge[]> {
    return this.db
      .select()
      .from(ChallengesTable)
      .where(
        and(
          sql`${ChallengesTable.scheduledAt} > NOW()`,
          eq(ChallengesTable.privacy, "Open"),
        ),
      );
  }

  async inviteUsersToChallenge(
    challengeId: string,
    userIds: string[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Ensure the challenge exists
      const challengeExists = await tx
        .select()
        .from(ChallengesTable)
        .where(eq(ChallengesTable.challengeId, challengeId))
        .limit(1);

      if (challengeExists.length === 0) {
        throw new NotFoundError("Challenge not found");
      }

      // Find already invited users
      const existingInvites = await tx
        .select({ userId: UserChallengesTable.userId })
        .from(UserChallengesTable)
        .where(
          and(
            eq(UserChallengesTable.challengeId, challengeId),
            inArray(UserChallengesTable.userId, userIds),
          ),
        );

      // Filter out already invited users
      const existingUserIds = new Set(
        existingInvites.map((invite) => invite.userId),
      );
      const newUsersToInvite = userIds.filter(
        (userId) => !existingUserIds.has(userId),
      );

      if (newUsersToInvite.length === 0) {
        return; // No new users to invite, so just return
      }

      // Insert new invites
      await tx.insert(UserChallengesTable).values(
        newUsersToInvite.map((userId) => ({
          userId,
          challengeId,
          status: UserChallengeStatus.Pending,
        })),
      );
    });
  }

  async updateChallengeStatus(
    userId: string,
    challengeId: string,
    status: UserChallengeStatusType,
  ): Promise<UserChallenge> {
    const [updated] = await this.db
      .update(UserChallengesTable)
      .set({ status })
      .where(
        and(
          eq(UserChallengesTable.userId, userId),
          eq(UserChallengesTable.challengeId, challengeId),
        ),
      )
      .returning();

    return updated || null;
  }

  async enterPublicChallenge(
    userId: string,
    challengeId: string,
  ): Promise<UserChallenge> {
    // Verify the challenge exists and is public
    const [challenge] = await this.db
      .select()
      .from(ChallengesTable)
      .where(
        and(
          eq(ChallengesTable.challengeId, challengeId),
          // eq(ChallengesTable.privacy, ChallengePrivacy.Open),
        ),
      )
      .limit(1);

    if (!challenge) {
      throw new NotFoundError("Public challenge not found");
    }
    // Already in or completed same challenge
    const [sameChallenge] = await this.db
      .select()
      .from(UserChallengesTable)
      .where(
        and(
          eq(UserChallengesTable.userId, userId),
          eq(UserChallengesTable.challengeId, challengeId),
          inArray(UserChallengesTable.status, [
            UserChallengeStatus.Accepted,
            UserChallengeStatus.Completed,
          ]),
        ),
      )
      .limit(1);

    if (sameChallenge) {
      return sameChallenge;
    }

    // In a diffferent challenge
    const [differentChallenge] = await this.db
      .select()
      .from(UserChallengesTable)
      .where(
        and(
          eq(UserChallengesTable.userId, userId),
          eq(UserChallengesTable.status, UserChallengeStatus.Accepted),
        ),
      )
      .limit(1);

    if (differentChallenge) {
      throw new Error("user already in a different challenge");
    }

    const [userChallenge] = await this.db
      .insert(UserChallengesTable)
      .values({
        userId,
        challengeId,
        status: UserChallengeStatus.Accepted,
      })
      .returning();

    return userChallenge || null;
  }

  async enterInvitationalChallenge(challengeId: string, userId: string) {
    return this.enterPublicChallenge(userId, challengeId);
  }

  async getChallengeParticipants(challengeId: string) {
    return this.db
      .select({
        ...getTableColumns(TypingSessionsTable),
        username: UsersTable.username,
      })
      .from(TypingSessionsTable)
      .innerJoin(UsersTable, eq(TypingSessionsTable.userId, UsersTable.userId))
      .where(eq(TypingSessionsTable.challengeId, challengeId));
  }

  async getChallengeParticipantsCount(challengeId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(UserChallengesTable)
      .where(
        and(
          eq(UserChallengesTable.challengeId, challengeId),
          eq(UserChallengesTable.status, UserChallengeStatus.Accepted),
        ),
      );

    return result.count || 0;
  }

  async updateChallenge(challengeId: string, data: Partial<Challenge>) {
    const [updated] = await this.db
      .update(ChallengesTable)
      .set(data)
      .where(eq(ChallengesTable.challengeId, challengeId))
      .returning();

    if (!updated) throw new NotFoundError("Challenge not found");
    return updated;
  }

  async startUnstartedChallenge(challengeId: string) {
    return await this.db.transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(ChallengesTable)
        .where(eq(ChallengesTable.challengeId, challengeId))
        .limit(1);

      if (!challenge) {
        throw new NotFoundError("Challenge not found");
      }

      if (challenge.startedAt) {
        return null;
      }

      const [updatedChallenge] = await tx
        .update(ChallengesTable)
        .set({ startedAt: new Date() })
        .where(eq(ChallengesTable.challengeId, challengeId))
        .returning();

      return updatedChallenge ?? null;
    });
  }

  async getUnstartedChallenges() {
    return this.db
      .select({
        challengeId: ChallengesTable.challengeId,
        scheduledAt: ChallengesTable.scheduledAt,
      })
      .from(ChallengesTable)
      .where(gt(ChallengesTable.scheduledAt, sql`NOW()`));
  }
}
