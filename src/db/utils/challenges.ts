import { Challenges, UserChallenges } from '../schema/db.schema';
import db from '..';
import { eq } from 'drizzle-orm';

export const getChallengeCapacity = async (challengeId: string) => {
  const challenge = await db.select().from(Challenges)
    .where(eq(Challenges.challengeId, challengeId));
  return challenge[0]?.capacity || 0;
};

export const getCurrentParticipants = async (challengeId: string) => {
  return await db.select()
    .from(UserChallenges)
    .where(eq(UserChallenges.challengeId, challengeId));
};
