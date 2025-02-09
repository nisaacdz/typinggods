import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  type Challenge,
  type NewChallenge,
  type UserChallenge,
  ChallengesTable,
  ListedChallenge,
  UserChallengesTable,
  UserChallengeStatus,
  UserChallengeStatusType,
} from "../db/schema/db.schema";
import { DatabaseError, NotFoundError } from "../errors";

const ListedChallengeSelection = {
  challengeId: ChallengesTable.challengeId,
  createdBy: ChallengesTable.createdBy,
  createdAt: ChallengesTable.createdAt,
  scheduledTime: ChallengesTable.scheduledTime,
  privacy: ChallengesTable.privacy,
  duration: ChallengesTable.duration,
};

export class ChallengeService {
  challengeClosedWindow = 10 * 1000; // 10 seconds
  constructor(private readonly db: NodePgDatabase) {}

  async createChallenge(challengeData: NewChallenge): Promise<ListedChallenge> {
    const [challenge] = await this.db
      .insert(ChallengesTable)
      .values(challengeData)
      .returning(ListedChallengeSelection);
    return challenge;
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

  async getInvitedChallenges(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<ListedChallenge[]> {
    return this.db
      .select(ListedChallengeSelection)
      .from(ChallengesTable)
      .innerJoin(
        UserChallengesTable,
        eq(ChallengesTable.challengeId, UserChallengesTable.challengeId),
      )
      .where(
        and(
          eq(ChallengesTable.privacy, "Invitational"),
          eq(UserChallengesTable.userId, userId),
          eq(UserChallengesTable.status, UserChallengeStatus.Pending),
        ),
      )
      .limit(pageSize)
      .offset(page * pageSize);
  }

  async getPublicChallenges(limit: number): Promise<ListedChallenge[]> {
    return this.db
      .select(ListedChallengeSelection)
      .from(ChallengesTable)
      .where(
        and(
          eq(ChallengesTable.privacy, "Open"),
          sql`${ChallengesTable.scheduledTime} > NOW()`,
        ),
      )
      .limit(limit);
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
        ),
      )
      .limit(1);

    if (existingUserChallenge) {
      throw new DatabaseError("User already in challenge");
    }

    const [userChallenge] = await this.db
      .insert(UserChallengesTable)
      .values({
        userId,
        challengeId,
        status: UserChallengeStatus.Pending,
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
