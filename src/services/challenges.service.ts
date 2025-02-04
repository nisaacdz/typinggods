import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  ChallengesTable,
  NewChallenge,
  UserChallengesTable,
} from "../db/schema/db.schema";

export const getCurrentParticipants = async (challengeId: string) => {
  return await db
    .select()
    .from(UserChallengesTable)
    .where(eq(UserChallengesTable.challengeId, challengeId));
};

export const getChallengeById = async (challengeId: string) => {
  return await db
    .select()
    .from(ChallengesTable)
    .where(eq(ChallengesTable.challengeId, challengeId));
};

export const createChallenge = async (challenge: NewChallenge) => {
  const [createdChallenge] = await db
    .insert(ChallengesTable)
    .values({ ...challenge })
    .returning();

  if (!createdChallenge) {
    throw new Error("Failed to create challenge");
  }

  return createdChallenge;
};

export const addParticipant = async (challengeId: string, userId: string) => {
  const [existingParticipant] = await db
    .select()
    .from(UserChallengesTable)
    .where(eq(UserChallengesTable.userId, userId));

  if (existingParticipant) {
    throw new Error("User is already in a challenge");
  }

  const [participant] = await db
    .insert(UserChallengesTable)
    .values({ challengeId, userId })
    .returning();

  if (!participant) {
    throw new Error("Failed to add participant");
  }

  return participant;
};
