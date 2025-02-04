import { eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import { UpdateUser, UsersTable } from "../db/schema/db.schema";

import { Request } from "express";

export async function searchUsers(req: Request) {
  const { search, page = 1, pageSize = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);

  let query = db.select().from(UsersTable);

  let dataQuery;

  if (search) {
    const searchTerm = `%${search}%`;
    dataQuery = query
      .where(
        or(
          ilike(UsersTable.username, searchTerm),
          ilike(UsersTable.email, searchTerm),
          sql`lower(${UsersTable.username} || ' ' || ${UsersTable.email}) LIKE lower(${"%" + search + "%"})`,
        ),
      )
      .offset(offset)
      .limit(Number(pageSize))
      .prepare("data")
      .execute();
  } else {
    dataQuery = query
      .offset(offset)
      .limit(Number(pageSize))
      .prepare("data")
      .execute();
  }

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(UsersTable)
    .prepare("count")
    .execute();

  const [data, totalResult] = await Promise.all([dataQuery, countQuery]);

  return {
    data,
    total: Number(totalResult[0]?.count ?? 0),
    page: Number(page),
    pageSize: Number(pageSize),
  };
}

export async function updateUser(userId: string, data: UpdateUser) {
  const [updatedUser] = await db
    .update(UsersTable)
    .set(data)
    .where(eq(UsersTable.userId, userId))
    .returning();

  if (!updatedUser) {
    throw new Error("Failed to update user");
  }

  return updatedUser;
}

export async function deleteUser(userId: string) {
  const [deletedUser] = await db
    .delete(UsersTable)
    .where(eq(UsersTable.userId, userId))
    .returning();

  if (!deletedUser) {
    throw new Error("Failed to delete user");
  }

  return deletedUser;
}

export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(UsersTable)
    .where(eq(UsersTable.userId, userId));

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function getUser(username: string) {
  const [user] = await db
    .select()
    .from(UsersTable)
    .where(eq(UsersTable.username, username));

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
