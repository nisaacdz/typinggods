import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  Challenge,
  ChallengePrivacy,
  ChallengesTable,
  TypingSessionsTable,
  UserTypingSessionsTable,
} from "../db/schema/db.schema";
import { acceptedInvite, getUserById } from "./user.service";
import { getChallengeById, getActiveParticipants } from "./challenges.service";
import { generateTypingText } from "./text.service";

export async function getCurrentSession(userId: string) {
  const [session] = await db
    .select()
    .from(UserTypingSessionsTable)
    .where(eq(UserTypingSessionsTable.userId, userId))
    .limit(1);

  return session ?? null;
}

export async function flushSession(userId: string) {
  await db
    .delete(UserTypingSessionsTable)
    .where(eq(UserTypingSessionsTable.userId, userId))
    .execute();
}

export async function registerSession(userId: string, challenge: Challenge) {
  const [userSession] = await db
    .insert(UserTypingSessionsTable)
    .values({ userId, challengeId: challenge.challengeId })
    .returning();
  return userSession ?? null;
}

export async function enterTypingZone(userId: string, challengeId: string) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found");
  }

  if (challenge.privacy === ChallengePrivacy.Invitational) {
    const accepted = await acceptedInvite(user, challengeId);
    if (!accepted) {
      throw new Error("Challenge is invitational");
    }
  }

  const currentSession = await getCurrentSession(userId);

  if (currentSession) {
    throw new Error("User is already in a typing session");
  }

  const userSession = await registerSession(userId, challenge);

  return { ...userSession, sessionId: challenge.sessionId };
}

export async function getTypingSessionById(sessionId: string) {
  const [session] = await db
    .select()
    .from(TypingSessionsTable)
    .where(eq(TypingSessionsTable.sessionId, sessionId))
    .limit(1);

  return session ?? null;
}

export async function getUserTypingSession(userId: string) {
  const [session] = await db
    .select()
    .from(UserTypingSessionsTable)
    .where(eq(UserTypingSessionsTable.userId, userId))
    .limit(1);

  return session ?? null;
}

export async function processUserTyping(
  challengeId: string,
  userId: string,
  letters: string,
) {
  // 1. Validate the challenge exists
  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found");
  }

  // 2. Get user's active session FOR THIS SPECIFIC CHALLENGE
  const [userSession] = await db
    .select()
    .from(UserTypingSessionsTable)
    .where(eq(UserTypingSessionsTable.userId, userId))
    .limit(1);

  let endTime = userSession.endTime;

  // 3. Validate active session exists
  if (!userSession || endTime) {
    throw new Error("User is not in a typing session");
  }

  // 4. Get typing session content
  const [typingSession] = await db
    .select()
    .from(TypingSessionsTable)
    .where(eq(TypingSessionsTable.sessionId, challenge.sessionId))
    .limit(1);

  if (!typingSession) {
    throw new Error("Session not found");
  }

  if (!typingSession.typingText)
    return { ...userSession, sessionId: challenge.sessionId };

  const typingText = typingSession.typingText;
  let currentPos = userSession.currentPos;
  let correctStrokes = userSession.correctStrokes;
  let lettersIdx = 0;

  while (currentPos < typingText.length && lettersIdx < letters.length) {
    const letter = letters[lettersIdx++];
    if (letter === "\b") {
      currentPos = Math.max(currentPos - 1, 0);
    } else {
      if (letter === typingText[currentPos]) {
        correctStrokes++;
      }
      currentPos++;
    }
  }

  if (currentPos >= typingText.length) {
    endTime = new Date();
  }

  // 7. Update database with new values
  await db
    .update(UserTypingSessionsTable)
    .set({
      currentPos: Math.min(currentPos, typingText.length), // Prevent overflow
      correctStrokes,
    })
    .where(eq(UserTypingSessionsTable.userId, userId));

  // 8. Return updated session data
  return {
    ...userSession,
    currentPos: Math.min(currentPos, typingText.length),
    correctStrokes,
    endTime,
    sessionId: challenge.sessionId,
  };
}

export async function getTypingZoneData(challengeId: string, userId: string) {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const [session, participants] = await Promise.all([
    getTypingSessionById(challenge.sessionId),
    getActiveParticipants(challengeId),
  ]);

  const participantsData = await Promise.all(
    participants.map(async (participant) => {
      const [participantSession] = await db
        .select({ currentPos: UserTypingSessionsTable.currentPos })
        .from(UserTypingSessionsTable)
        .where(eq(UserTypingSessionsTable.userId, participant.userId))
        .limit(1);
      return participantSession;
    }),
  );

  const userSession = await getUserTypingSession(userId);

  return {
    participants: participantsData,
    challenge,
    session,
    user: userSession,
  };
}

export const startSession = async (challengeId: string) => {
  const [challenge] = await db
    .select()
    .from(ChallengesTable)
    .where(eq(ChallengesTable.challengeId, challengeId))
    .limit(1);

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const participants = await getActiveParticipants(challengeId);

  if (!participants.length) {
    throw new Error("Challenge has no participants");
  }

  const sessionId = challenge.sessionId;
  const typingText = generateTypingText();
  // 200ms estimated time the response gets to the clients
  const startTime = new Date(Date.now() + 100);

  const [startedSession] = await db
    .update(TypingSessionsTable)
    .set({ typingText, startTime })
    .where(eq(TypingSessionsTable.sessionId, sessionId))
    .returning();

  return startedSession ?? null;
};

export async function getSessionIdFromChallengeId(challengeId: string) {
  const [challenge] = await db
    .select({ sessionId: ChallengesTable.sessionId })
    .from(ChallengesTable)
    .where(eq(ChallengesTable.challengeId, challengeId))
    .limit(1);

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  return challenge.sessionId;
}
