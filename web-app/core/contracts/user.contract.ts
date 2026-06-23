import { z } from "zod";

const roleSchema = z.enum(["admin", "agent"]);

const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  role: roleSchema,
  business_name: z.string().min(1),
  created_at: z.string(),
});

const createRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: roleSchema.default("admin"),
  business_name: z.string().min(1),
});

export const UserContract = {
  roleSchema,
  entitySchema,
  createRequestSchema,
} as const;

export type UserRole = z.infer<typeof roleSchema>;
export type User = z.infer<typeof entitySchema>;
export type CreateUserRequest = z.infer<typeof createRequestSchema>;
