import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  eq,
  and,
  sql,
  inArray,
  count,
  gt,
  getTableColumns,
  asc,
} from "drizzle-orm";
import {
  type Challenge,
  type NewChallenge,
  type UserChallenge,
  ChallengePrivacy,
  ChallengesTable,
  CreatedChallenge,
  ListedChallenge,
  UserChallengesTable,
  UserChallengeStatus,
  UserChallengeStatusType,
  UsersTable,
} from "../db/schema/db.schema";

import { DatabaseError, NotFoundError } from "../errors";

const CreatedChallengeSelection = {
  challengeId: ChallengesTable.challengeId,
  createdBy: ChallengesTable.createdBy,
  createdAt: ChallengesTable.createdAt,
  scheduledTime: ChallengesTable.scheduledTime,
  privacy: ChallengesTable.privacy,
  duration: ChallengesTable.duration,
};

const ListedChallengeSelection = {
  challengeId: ChallengesTable.challengeId,
  createdBy: {
    userId: UsersTable.userId,
    username: UsersTable.username,
    email: UsersTable.email,
  },
  createdAt: ChallengesTable.createdAt,
  scheduledTime: ChallengesTable.scheduledTime,
  privacy: ChallengesTable.privacy,
  duration: ChallengesTable.duration,
};

export class ChallengeService {
  challengeClosedWindow = 10 * 1000;
  constructor(private readonly db: NodePgDatabase) {}

  async createChallenge(challengeData: NewChallenge) {
    const [challenge] = await this.db
      .insert(ChallengesTable)
      .values(challengeData)
      .returning(CreatedChallengeSelection);
    return { ...challenge, participants: 0 };
  }

  async getChallengeById(challengeId: string): Promise<Challenge> {
    const [challenge] = await this.db
      .select()
      .from(ChallengesTable)
      .where(eq(ChallengesTable.challengeId, challengeId))
      .limit(1);

    if (!challenge) throw new NotFoundError("Challenge not found");
    return challenge;
  }

  async getChallenges(
    page: number,
    pageSize: number,
    sortBy?: string,
    filter?: string,
  ): Promise<ListedChallenge[]> {
    const result = await this.db
      .select({
        ...getTableColumns(ChallengesTable),
        createdBy: {
          userId: UsersTable.userId,
          username: UsersTable.username,
          email: UsersTable.email,
        },
        participants: this.db
          .select({
            count: count().as("count"),
          })
          .from(UserChallengesTable)
          .where(
            and(
              eq(UserChallengesTable.challengeId, ChallengesTable.challengeId),
              eq(UserChallengesTable.status, UserChallengeStatus.Accepted),
            ),
          )
          .as("participants").count,
      })
      .from(ChallengesTable)
      .innerJoin(UsersTable, eq(ChallengesTable.createdBy, UsersTable.userId))
      .orderBy(asc(ChallengesTable.scheduledTime))
      .limit(pageSize)
      .offset(page * pageSize);

    return result;
  }

  async getUserChallenge(
    userId: string,
    challengeId: string,
  ): Promise<UserChallenge> {
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

    if (!userChallenge) throw new NotFoundError("User challenge not found");
    return userChallenge;
  }

  async getActiveChallenges(): Promise<Challenge[]> {
    return this.db
      .select()
      .from(ChallengesTable)
      .where(
        and(
          sql`${ChallengesTable.scheduledTime} > NOW()`,
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

    if (!updated) throw new NotFoundError("Challenge invitation not found");
    return updated;
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
          eq(ChallengesTable.privacy, "Open"),
        ),
      )
      .limit(1);

    if (!challenge) {
      throw new NotFoundError("Public challenge not found or not open");
    }

    const [existingUserChallenge] = await this.db
      .select()
      .from(UserChallengesTable)
      .where(
        and(
          eq(UserChallengesTable.userId, userId),
          eq(UserChallengesTable.challengeId, challengeId),
          eq(UserChallengesTable.status, UserChallengeStatus.Accepted),
        ),
      )
      .limit(1);

    if (existingUserChallenge) {
      // throw new DatabaseError("User already in challenge");
      console.log("User already in challenge", existingUserChallenge);
      return existingUserChallenge;
    }

    const [userChallenge] = await this.db
      .insert(UserChallengesTable)
      .values({
        userId,
        challengeId,
        status: UserChallengeStatus.Accepted,
      })
      .returning();

    return userChallenge;
  }

  async getChallengeParticipants(
    challengeId: string,
  ): Promise<UserChallenge[]> {
    return this.db
      .select()
      .from(UserChallengesTable)
      .where(
        and(
          eq(UserChallengesTable.challengeId, challengeId),
          eq(UserChallengesTable.status, UserChallengeStatus.Accepted),
        ),
      );
  }
}
