import { db } from "../db";
import { and, eq, sql } from "drizzle-orm";
import {
  ChallengePrivacy,
  ChallengesTable,
  NewChallenge,
  TypingSessionsTable,
  UserChallengesTable,
  UserChallengeStatus,
  UserTypingSessionsTable,
} from "../db/schema/db.schema";

export const getActiveParticipants = async (challengeId: string) => {
  return await db
    .select({
      userId: UserTypingSessionsTable.userId,
    })
    .from(UserTypingSessionsTable)
    .where(eq(UserTypingSessionsTable.challengeId, challengeId));
};

export const getChallengeById = async (challengeId: string) => {
  const [challenge] = await db
    .select()
    .from(ChallengesTable)
    .where(eq(ChallengesTable.challengeId, challengeId));

  return challenge ?? null;
};

export const createChallenge = async (challenge: NewChallenge) => {
  const [session] = await db
    .insert(TypingSessionsTable)
    .values({ typingText: null, startTime: challenge.startTime })
    .returning();

  if (!session) {
    throw new Error("Failed to create session");
  }

  const [createdChallenge] = await db
    .insert(ChallengesTable)
    .values({ ...challenge, sessionId: session.sessionId })
    .returning();

  if (!createdChallenge) {
    throw new Error("Failed to create challenge");
  }

  return createdChallenge;
};

export const addParticipant = async (
  challengeId: string,
  userId: string,
  status: UserChallengeStatus = UserChallengeStatus.Pending,
) => {
  const [existingParticipant] = await db
    .select()
    .from(UserChallengesTable)
    .where(eq(UserChallengesTable.userId, userId));

  if (existingParticipant) {
    throw new Error("User is already in a challenge");
  }

  const [participant] = await db
    .insert(UserChallengesTable)
    .values({ challengeId, userId, status })
    .returning();

  if (!participant) {
    throw new Error("Failed to add participant");
  }

  return participant;
};

export const acceptChallenge = async (challengeId: string, userId: string) => {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const [participant] = await db
    .update(UserChallengesTable)
    .set({ status: UserChallengeStatus.Accepted })
    .where(
      and(
        eq(UserChallengesTable.userId, userId),
        eq(UserChallengesTable.challengeId, challengeId),
      ),
    )
    .returning();

  if (!participant) {
    throw new Error("Failed to accept challenge");
  }

  return challenge;
};

export const getAcceptedChallenge = async (userId: string) => {
  const [challenge] = await db
    .select()
    .from(UserChallengesTable)
    .where(
      and(
        eq(UserChallengesTable.userId, userId),
        eq(UserChallengesTable.status, UserChallengeStatus.Accepted),
      ),
    )
    .limit(1);

  return challenge ?? null;
};

// Get all user challenges that userId has been invited to
export const getUserChallenges = async (userId: string) => {
  return await db
    .select()
    .from(UserChallengesTable)
    .where(eq(UserChallengesTable.userId, userId));
};

export const getOpenChallenges = async (req: any) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);

  let query = db.select().from(ChallengesTable);

  let dataQuery = query
    .where(eq(ChallengesTable.privacy, ChallengePrivacy.Open))
    .offset(offset)
    .limit(Number(pageSize))
    .prepare("data")
    .execute();

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(ChallengesTable)
    .where(eq(ChallengesTable.privacy, ChallengePrivacy.Open))
    .prepare("count")
    .execute();

  const [data, totalResult] = await Promise.all([dataQuery, countQuery]);

  return {
    data,
    total: Number(totalResult[0]?.count ?? 0),
    page: Number(page),
    pageSize: Number(pageSize),
  };
};

export const getAcceptedParticipants = async (challengeId: string) => {
  return await db
    .select()
    .from(UserChallengesTable)
    .where(
      and(
        eq(UserChallengesTable.challengeId, challengeId),
        eq(UserChallengesTable.status, UserChallengeStatus.Accepted),
      ),
    );
};

export const getAllChallenges = async (req: any) => {
  // I want to fetch both invitational and open challenges
  // Also don't want to include duplicates (no challengeId should occur more than once)
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
};
