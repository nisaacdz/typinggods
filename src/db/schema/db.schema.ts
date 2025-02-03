import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { 
  pgTable, uuid, varchar, uniqueIndex, timestamp, integer, text, index, 
  boolean
} from "drizzle-orm/pg-core"; // <-- Fixed index import
import { sql } from "drizzle-orm";

// Table for third-party auth providers
const AuthProviders = pgTable("auth_providers", {
  providerId: uuid("provider_id").defaultRandom().primaryKey(),
  providerName: varchar("provider_name", { length: 50 }).notNull().unique(),
  authenticationUrl: text("authentication_url").notNull(),
});

type AuthProviderType = InferSelectModel<typeof AuthProviders>;
type NewAuthProviderType = InferInsertModel<typeof AuthProviders>;

// Updated Users table
const Users = pgTable("users", {
  userId: uuid("user_id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull(),
  email: varchar("email", { length: 256 }).unique().notNull(),
  password: varchar("password", { length: 256 }),
  authProviderId: uuid("auth_provider_id").references(() => AuthProviders.providerId),
  externalId: text("external_id"), 
}, (table) => ({
  usernameUniqueIdx: uniqueIndex("username_unique_idx")
    .on(sql`lower(${table.username})`),
  // Optional: Add a composite unique constraint for external auth
  externalAuthUniqueIdx: uniqueIndex("external_auth_unique_idx")
    .on(table.authProviderId, table.externalId)
    .where(sql`${table.authProviderId} IS NOT NULL`),
}));

type UserType = InferSelectModel<typeof Users>;
type NewUserType = InferInsertModel<typeof Users>;

// Challenges table (unchanged)
const Challenges = pgTable("challenges", {
  challengeId: uuid("challenge_id").defaultRandom().primaryKey(),
  createdBy: uuid("created_by").notNull().references(() => Users.userId),
  capacity: integer("capacity").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  startTime: timestamp("start_time"),
});

type ChallengeType = InferSelectModel<typeof Challenges>;
type NewChallengeType = InferInsertModel<typeof Challenges>;

const UserChallenges = pgTable("user_challenges", {
  userId: uuid("user_id").notNull().references(() => Users.userId),
  challengeId: uuid("challenge_id").notNull().references(() => Challenges.challengeId),
}, (table) => ({
  pk: uniqueIndex("user_challenges_pk").on(table.userId, table.challengeId),
  userIdIdx: index("user_id_idx").on(table.userId),
  challengeIdIndex: index("challenge_id_index").on(table.challengeId),
  accepted: boolean("accepted").default(false).notNull(),
}));

type UserChallengeType = InferSelectModel<typeof UserChallenges>;
type NewUserChallengeType = InferInsertModel<typeof UserChallenges>;

export {
  AuthProviders, AuthProviderType, NewAuthProviderType,
  Users, UserType, NewUserType,
  Challenges, ChallengeType, NewChallengeType,
  UserChallenges, UserChallengeType, NewUserChallengeType,
};