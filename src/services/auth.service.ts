import { Request } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";
import { AuthProvidersTable, User, UsersTable } from "../db/schema/db.schema";
import { db } from "../db";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import Axios from "axios";

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

export async function login(email: string, password: string) {
  const [user] = await db
    .select()
    .from(UsersTable)
    .where(eq(UsersTable.email, email));
  if (!user || !user.password) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  return generateToken(user);
}

export async function loginWithProvider(
  providerId: string,
  accessToken: string,
) {
  const [provider] = await db
    .select()
    .from(AuthProvidersTable)
    .where(eq(AuthProvidersTable.providerId, providerId));

  if (!provider) {
    throw new Error("Invalid provider");
  }

  try {
    const response = await Axios.get(
      provider.loginUrl.replace("{accessToken}", accessToken),
    );
    return {
      id: response.data.sub,
      email: response.data.email,
    };
  } catch (error) {
    return null;
  }
}

export async function registerWithProvider(providerId: string) {
  const [provider] = await db
    .select()
    .from(AuthProvidersTable)
    .where(eq(AuthProvidersTable.providerId, providerId));

  if (!provider) {
    throw new Error("Invalid provider");
  }

  const response = await Axios.get(provider.registerUrl);

  const email = response.data.email;
  const externalId = response.data.sub;

  if (!email || !externalId) {
    throw new Error("Invalid provider response");
  }

  const [existingUser] = await db
    .select()
    .from(UsersTable)
    .where(
      or(eq(UsersTable.email, email), eq(UsersTable.externalId, externalId)),
    );
  if (existingUser) {
    throw new Error("User already exists");
  }

  const username = generateUsername();
  const newUser = await db
    .insert(UsersTable)
    .values({ email, username, externalId })
    .returning();
  return newUser[0];
}

function generateToken({ userId, username, email }: User) {
  return jwt.sign(
    {
      userId,
      username,
      email,
      password: null,
      authProvider: null,
      externalId: null,
    },
    "Env.JWT_SECRET",
    { expiresIn: "3h" },
  );
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

export function getCurrentUser(req: Request | string) {
  try {
    let token;
    if (typeof req === "string") {
      token = req;
    } else {
      token = req.headers.authorization?.split(" ")[1];
    }
    if (!token) return null;
    const payload = verifyToken(token) as User;
    return payload;
  } catch (error) {
    return null;
  }
}
