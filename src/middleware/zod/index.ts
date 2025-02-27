import { z } from "zod";
import {
  ChallengePrivacy,
  UserChallengeStatus,
} from "../../db/schema/db.schema";

const ChallengeFilterSchema = z.object({
  privacy: z.nativeEnum(ChallengePrivacy).optional(),
  search: z.string().optional(),
});

const UserChallengeFilterSchema = z.object({
  status: z.nativeEnum(UserChallengeStatus).optional(),
  privacy: z.nativeEnum(ChallengePrivacy).optional(),
  search: z.string().optional(),
});

export const ChallengeMetaSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).default(15),
  filter: ChallengeFilterSchema.optional(),
});

export const UserChallengeMetaSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).default(15),
  filter: UserChallengeFilterSchema.optional(),
});

export type UserChallengeFilter = z.infer<typeof UserChallengeFilterSchema>;
export type ChallengeFilter = z.infer<typeof ChallengeFilterSchema>;
