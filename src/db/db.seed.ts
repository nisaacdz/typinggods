import { faker } from "@faker-js/faker";
import { db } from "./index"; // Drizzle instance
import {
  AuthProvidersTable,
  ChallengePrivacy,
  ChallengesTable,
  TypingSessionsTable,
  UserChallengesTable,
  UsersTable,
} from "./schema/db.schema"; // Table schema for auth providers
import { count, eq, or, lt } from "drizzle-orm";

const authProviders = [
  {
    providerName: "Google",
    loginUrl: "https://accounts.google.com/signin",
    registerUrl: "https://accounts.google.com/signup",
    logoUrl: "https://example.com/google-logo.png",
  },
  {
    providerName: "GitHub",
    loginUrl: "https://github.com/login",
    registerUrl: "https://github.com/signup",
    logoUrl: "https://example.com/github-logo.png",
  },
];

const users = [
  {
    email: "noone@domain.com",
    password: "password",
    username: "noone",
  },
  {
    email: "johndoe@domain.com",
    password: "password",
    username: "johndoe",
  },
  {
    email: "newt@domain.com",
    password: "123456789",
    username: "newt",
  },
];

const seedAuthProviders = async () => {
  for (const provider of authProviders) {
    const existingProvider = await db
      .select()
      .from(AuthProvidersTable)
      .where(eq(AuthProvidersTable.providerName, provider.providerName));

    if (existingProvider.length === 0) {
      await db.insert(AuthProvidersTable).values(provider);
      console.log(`✅ Inserted: ${provider.providerName}`);
    } else {
      console.log(`⚠️ Already exists: ${provider.providerName}`);
    }
  }
};

const seedUsers = async () => {
  for (const user of users) {
    const existingUser = await db
      .select()
      .from(UsersTable)
      .where(
        or(
          eq(UsersTable.email, user.email),
          eq(UsersTable.username, user.username),
        ),
      );

    if (existingUser.length === 0) {
      await db.insert(UsersTable).values(user);
      console.log(`✅ Inserted: ${user.email}`);
    } else {
      console.log(`⚠️ Already exists: ${user.email}`);
    }
  }
};

const seedChallenges = async () => {
  // Remove all outdated challenges
  // Count remaining challenges
  // Insert new challenges to reach 50
  // Challenges should have scchedule time randomly picked from the next 7 days
  // duration should also be random between 15 seconds and 10 minutes
  // Assign all users listed in the users array to the challenges
  // Assign all users to the first 10 challenges
  // Assign to only invitational challenges
  // Create aproximately half Public and half Invitational challenge

  await db.delete(TypingSessionsTable);
  await db.delete(UserChallengesTable);
  await db.delete(ChallengesTable);

  const [remainingChallenges] = await db
    .select({ count: count() })
    .from(ChallengesTable)
    .execute();

  if (remainingChallenges.count >= 50) {
    console.log("✅ No need to seed challenges");
    return;
  }

  const users = await db.select().from(UsersTable).execute();

  const newChallenges = Array.from(
    { length: 50 - remainingChallenges.count },
    (_, i) => {
      const isPublic = Math.random() < 0.5;
      const scheduledAt = new Date(
        Date.now() + 120000 + 1000 * 60 * Math.floor(Math.random() * 10),
      );
      const duration = Math.floor(Math.random() * (10 * 60 - 15) + 15);
      return {
        privacy: isPublic
          ? ChallengePrivacy.Open
          : ChallengePrivacy.Invitational,
        createdBy: users[i % users.length].userId,
        text: faker.lorem.words(24),
        scheduledAt,
        duration,
      };
    },
  );

  await db.insert(ChallengesTable).values(newChallenges);
};

const seed = async () => {
  await Promise.all([seedAuthProviders(), seedUsers(), seedChallenges()]);
};

seed()
  .then(() => {
    console.log("✅ Seed completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
