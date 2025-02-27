import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  uniqueIndex,
  timestamp,
  text,
  index,
  pgEnum,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { start } from "repl";

/**
 * Auth Providers Table
 * Stores information about the authentication providers
 */
export const AuthProvidersTable = pgTable("auth_providers", {
  providerId: uuid("provider_id").defaultRandom().primaryKey(),
  providerName: varchar("provider_name", { length: 50 }).notNull().unique(),
  loginUrl: text("login_url").notNull(),
  registerUrl: text("register_url").notNull(),
  logoUrl: text("logo_url"),
});
export type AuthProvider = InferSelectModel<typeof AuthProvidersTable>;

/**
 * Users Table
 * Stores user information
 */
export const UsersTable = pgTable(
  "users",
  {
    userId: uuid("user_id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 50 }).notNull(),
    email: varchar("email", { length: 256 }).unique().notNull(),
    password: varchar("password", { length: 256 }),
    authProvider: uuid("auth_provider_id").references(
      () => AuthProvidersTable.providerId,
    ),
    externalId: text("external_id"),
  },
  (table) => ({
    usernameUniqueIdx: uniqueIndex("username_unique_idx").on(
      sql`lower(${table.username})`,
    ),
    externalAuthUniqueIdx: uniqueIndex("external_auth_unique_idx")
      .on(table.authProvider, table.externalId)
      .where(sql`${table.authProvider} IS NOT NULL`),
  }),
);
export type User = InferSelectModel<typeof UsersTable>;
export type NewUser = InferInsertModel<typeof UsersTable>;
export type LocalUser = Omit<
  Omit<Omit<User, "password">, "authProvider">,
  "externalId"
>;

/**
 * Challenge Privacy Enum
 * Enum for challenge privacy
 * Open - Anyone can join the challenge
 * Invitational - Only invited users can join the challenge
 */
export const ChallengePrivacy = {
  Open: "Open",
  Invitational: "Invitational",
} as const;

export type ChallengePrivacyType =
  (typeof ChallengePrivacy)[keyof typeof ChallengePrivacy];

export const ChallengePrivacyEnum = pgEnum(
  "challenge_privacy",
  Object.values(ChallengePrivacy) as [
    ChallengePrivacyType,
    ...ChallengePrivacyType[],
  ],
);

/**
 * Challenge Table
 * Stores information about the challenges
 */
export const ChallengesTable = pgTable("challenges", {
  challengeId: uuid("challenge_id").defaultRandom().primaryKey(),
  challengeTitle: varchar("challenge_title", { length: 100 }).notNull(),
  text: text("text").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => UsersTable.userId),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  privacy: ChallengePrivacyEnum("privacy")
    .notNull()
    .default(ChallengePrivacy.Open),
  duration: integer("duration_seconds").notNull(),
});

export type Challenge = InferSelectModel<typeof ChallengesTable>;
export type NewChallenge = InferInsertModel<typeof ChallengesTable>;
export type ListedChallenge = Omit<Challenge, "text" | "createdBy"> & {
  createdBy: Pick<User, "userId" | "username" | "email">;
  participants: number;
};
export type CreatedChallenge = Omit<Challenge, "text">;

/**
 * User Challenge Status Enum
 * Enum for user challenge status
 * Accepted - User has accepted the challenge
 * Rejected - User has rejected the challenge
 * Pending - User has not yet accepted or rejected the challenge
 * Completed - User has completed the challenge
 * Abandoned - User has abondoned the challenge
 */

export const UserChallengeStatus = {
  Accepted: "Accepted",
  Rejected: "Rejected",
  Pending: "Pending",
  Completed: "Completed",
  Abandoned: "Abandoned",
} as const;

export type UserChallengeStatusType =
  (typeof UserChallengeStatus)[keyof typeof UserChallengeStatus];

export const UserChallengeStatusEnum = pgEnum(
  "user_challenge_status",
  Object.values(UserChallengeStatus) as [
    UserChallengeStatusType,
    ...UserChallengeStatusType[],
  ],
);

/**
 * User Challenges Table
 * Stores the challenges that users have joined
 */
export const UserChallengesTable = pgTable(
  "user_challenges",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => UsersTable.userId),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => ChallengesTable.challengeId),
    status: UserChallengeStatusEnum("status")
      .notNull()
      .default(UserChallengeStatus.Pending),
    joinedAt: timestamp("joined_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.challengeId] }),
    challengeIdx: index("challenge_idx").on(table.challengeId),
  }),
);
export type UserChallenge = InferSelectModel<typeof UserChallengesTable>;

/**
 * Typing Sessions Table
 * Stores typing sessions of users
 */
export const TypingSessionsTable = pgTable(
  "typing_sessions",
  {
    sessionId: uuid("session_id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UsersTable.userId),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => ChallengesTable.challengeId),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    wpm: integer("wpm"),
    accuracy: integer("accuracy"),
    totalKeystrokes: integer("total_keystrokes").notNull().default(0),
    correctPosition: integer("correct_position").notNull().default(0),
    currentPosition: integer("current_position").notNull().default(0),
  },
  (table) => ({
    activeSessionIdx: uniqueIndex("active_session_idx")
      .on(table.userId)
      .where(sql`${table.endTime} IS NULL`),
  }),
);
export type TypingSession = InferSelectModel<typeof TypingSessionsTable>;

/**
 * User Stats Table
 * Stores user stats like total completed challenges, average wpm, average accuracy, total keystrokes
 */
export const UserStatsTable = pgTable("user_stats", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => UsersTable.userId),
  competitions: integer("total_completed").notNull().default(0),
  wpm: integer("average_wpm").notNull().default(0),
  accuracy: integer("average_accuracy").notNull().default(0),
  keystrokes: integer("total_keystrokes").notNull().default(0),
  lastActive: timestamp("last_active"),
});

export type UserStats = InferSelectModel<typeof UserStatsTable>;
