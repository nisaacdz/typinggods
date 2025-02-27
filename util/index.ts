export const DefaultPageSize = 15;
export const DefaultPage = 1;

import { Socket } from "socket.io";
import { z } from "zod";
import {
  ChallengePrivacyType,
  User,
  UserChallengeStatusType,
} from "../src/db/schema/db.schema";

export const UsernameSchema = z.object({
  username: z
    .string()
    .min(5, "Username must be at least 5 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
});

export const EmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const PasswordSchema = z.object({
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[a-zA-Z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export type UsernameUpdate = z.infer<typeof UsernameSchema>;
export type EmailUpdate = z.infer<typeof EmailSchema>;
export type PasswordUpdate = z.infer<typeof PasswordSchema>;

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const handleError = (socket: Socket, errorMessage: string) => {
  socket.emit("error", errorMessage);
  console.error(`Socket Error (${socket.id}): ${errorMessage}`);
};

export const isValidInput = (character: unknown): character is string => {
  return typeof character === "string" && character.length === 1;
};

export enum ScheduleTypingResult {
  AlreadyStarted,
  AlreadyScheduled,
  Success,
  Failed,
}

export type PaginatedData<T> = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  data: T[];
};

export type UserChallengeFilter = {
  status?: UserChallengeStatusType;
  privacy?: ChallengePrivacyType;
  search?: string;
};

export type ChallengeFilter = {
  privacy?: ChallengePrivacyType;
  search?: string;
};

export type Meta<T> = {
  page: number;
  pageSize: number;
  filter?: T;
};
