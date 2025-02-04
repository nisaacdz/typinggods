import { db } from "./index"; // Drizzle instance
import { AuthProvidersTable } from "./schema/db.schema"; // Table schema for auth providers
import { eq } from "drizzle-orm";

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

const seed = async () => {
  await Promise.all([seedAuthProviders()]);
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
