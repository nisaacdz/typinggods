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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { da, en } from "@faker-js/faker";

export const AuthProvidersTable = pgTable("auth_providers", {
  providerId: uuid("provider_id").defaultRandom().primaryKey(),
  providerName: varchar("provider_name", { length: 50 }).notNull().unique(),
  loginUrl: text("login_url").notNull(),
  registerUrl: text("register_url").notNull(),
  logoUrl: text("logo_url"),
});

export type AuthProvider = InferSelectModel<typeof AuthProvidersTable>;

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
export type UpdateUser = Partial<Omit<User, "userId">>;

export const ChallengePrivacy = {
  Open: "Open",
  Invitational: "Invitational",
} as const;

export const ChallengePrivacyEnum = pgEnum(
  "challenge_privacy",
  Object.values(ChallengePrivacy) as [string, ...string[]],
);

export type ChallengePrivacy =
  (typeof ChallengePrivacy)[keyof typeof ChallengePrivacy];

export const ChallengesTable = pgTable("challenges", {
  challengeId: uuid("challenge_id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => TypingSessionsTable.sessionId),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => UsersTable.userId),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  startTime: timestamp("start_time").notNull(),
  privacy: ChallengePrivacyEnum("privacy")
    .notNull()
    .default(ChallengePrivacy.Open),
});

export type Challenge = InferSelectModel<typeof ChallengesTable>;
export type NewChallenge = Omit<
  Omit<InferInsertModel<typeof ChallengesTable>, "challengeId">,
  "sessionId"
>;

export const UserChallengeStatus = {
  Accepted: "Accepted",
  Rejected: "Rejected",
  Pending: "Pending",
} as const;

export const UserChallengeStatusEnum = pgEnum(
  "user_challenge_status",
  Object.values(UserChallengeStatus) as [string, ...[string]],
);
export type UserChallengeStatus =
  (typeof UserChallengeStatus)[keyof typeof UserChallengeStatus];

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
  },
  (table) => ({
    pk: uniqueIndex("user_challenges_pk").on(table.userId, table.challengeId),
    userIdIdx: index("user_id_idx").on(table.userId),
    challengeIdIndex: index("challenge_id_index").on(table.challengeId),
  }),
);

export type UserChallenge = InferSelectModel<typeof UserChallengesTable>;
export type NewUserChallenge = InferInsertModel<typeof UserChallengesTable>;

export const TypingSessionsTable = pgTable("typing_sessions_data", {
  sessionId: uuid("session_id").defaultRandom().primaryKey(),
  typingText: text("typing_text"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
});

export type TypingSessionData = InferSelectModel<typeof TypingSessionsTable>;
export type NewTypingSessionData = InferInsertModel<typeof TypingSessionsTable>;

export const UserTypingSessionsTable = pgTable(
  "typing_sessions",
  {
    userSessionId: uuid("session_id").defaultRandom().primaryKey(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => ChallengesTable.challengeId),
    userId: uuid("user_id")
      .notNull()
      .references(() => UsersTable.userId),
    endTime: timestamp("end_time"),
    currentPos: integer("current_pos").notNull().default(0),
    correctStrokes: integer("correct_strokes").notNull().default(0),
  },

  (table) => ({
    // Allows only one session per user at a time
    userIdIndex: uniqueIndex("userId_unique_idx").on(table.userId),
  }),
);

export type TypingSession = InferSelectModel<typeof UserTypingSessionsTable>;
export type NewTypingSession = InferInsertModel<typeof UserTypingSessionsTable>;
export type UpdateTypingSession = Partial<Omit<TypingSession, "sessionId">>;
