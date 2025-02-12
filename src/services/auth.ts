import { Request } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";
import {
  AuthProvidersTable,
  LocalUser,
  User,
  UsersTable,
} from "../db/schema/db.schema";
import { db } from "../db";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { Session, SessionData } from "express-session";

function generateUsername(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: "",
    length: 2,
    style: "capital",
  });
}

export async function register(email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await db
    .select()
    .from(UsersTable)
    .where(eq(UsersTable.email, email));
  if (existingUser.length > 0) {
    throw new Error("User already exists");
  }

  const username = generateUsername();
  const newUser = await db
    .insert(UsersTable)
    .values({ email, password: hashedPassword, username })
    .returning();
  return newUser[0];
}

export async function login(_username: string, _password: string) {
  // const { _email, _password } = req.body;
  // Temp login of default user for demo purposes
  const [user] = await db
    .select()
    .from(UsersTable)
    .where(eq(UsersTable.username, "newt"))
    .limit(1);

  return user || null;
}

// export async function loginWithProvider(
//   providerId: string,
//   accessToken: string,
// ) {
//   const [provider] = await db
//     .select()
//     .from(AuthProvidersTable)
//     .where(eq(AuthProvidersTable.providerId, providerId));

//   if (!provider) {
//     throw new Error("Invalid provider");
//   }

//   try {
//     const response = await Axios.get(
//       provider.loginUrl.replace("{accessToken}", accessToken),
//     );
//     return {
//       id: response.data.sub,
//       email: response.data.email,
//     };
//   } catch (error) {
//     return null;
//   }
// }

// export async function registerWithProvider(providerId: string) {
//   const [provider] = await db
//     .select()
//     .from(AuthProvidersTable)
//     .where(eq(AuthProvidersTable.providerId, providerId));

//   if (!provider) {
//     throw new Error("Invalid provider");
//   }

//   const response = await Axios.get(provider.registerUrl);

//   const email = response.data.email;
//   const externalId = response.data.sub;

//   if (!email || !externalId) {
//     throw new Error("Invalid provider response");
//   }

//   const [existingUser] = await db
//     .select()
//     .from(UsersTable)
//     .where(
//       or(eq(UsersTable.email, email), eq(UsersTable.externalId, externalId)),
//     );
//   if (existingUser) {
//     throw new Error("User already exists");
//   }

//   const username = generateUsername();
//   const newUser = await db
//     .insert(UsersTable)
//     .values({ email, username, externalId })
//     .returning();
//   return newUser[0];
// }

// function generateToken({ userId, username, email }: User) {
//   return jwt.sign(
//     {
//       userId,
//       username,
//       email,
//       password: null,
//       authProvider: null,
//       externalId: null,
//     },
//     "Env.JWT_SECRET",
//     { expiresIn: "3h" },
//   );
// }

// export function verifyToken(token: string) {
//   try {
//     return jwt.verify(token, process.env.JWT_SECRET as string);
//   } catch (error) {
//     throw new Error("Invalid or expired token");
//   }
// }

export function getCurrentUser(
  session: (Session & Partial<SessionData>) | undefined,
): LocalUser | null {
  return session?.user || null;
}

export function getCurrentUserFromRequest(req: Request): LocalUser | null {
  return getCurrentUser(req.session);
}

export function getToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  return authHeader.split(" ")[1];
}
