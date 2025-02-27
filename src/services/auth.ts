import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { LocalUser, UsersTable } from "../db/schema/db.schema";
import { db } from "../db";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { Session, SessionData } from "express-session";
import { EmailSchema, PasswordSchema } from "../../util";

function generateUsername(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: "",
    length: 3,
    style: "lowerCase",
  });
}

export async function login(username: string, password: string) {
  const [user] = await db
    .select({
      userId: UsersTable.userId,
      email: UsersTable.email,
      username: UsersTable.username,
      password: UsersTable.password,
    })
    .from(UsersTable)
    .where(eq(UsersTable.username, username))
    .limit(1);

  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    return null;
  }

  return user;
}

export async function signup(
  emailUnvalidated: string,
  passwordRawUnvalidated: string,
): Promise<LocalUser | null> {
  const { email } = EmailSchema.parse({ email: emailUnvalidated });
  const { password: passwordRaw } = PasswordSchema.parse({
    password: passwordRawUnvalidated,
  });
  const password = await bcrypt.hash(passwordRaw, 10);
  const username = generateUsername();
  let [localUser] = await db
    .insert(UsersTable)
    .values({ email, username, password })
    .returning({
      userId: UsersTable.userId,
      email: UsersTable.email,
      username: UsersTable.username,
    });

  return localUser;
}

export function getCurrentUser(
  session: (Session & Partial<SessionData>) | undefined,
): LocalUser | null {
  return session?.user || null;
}
