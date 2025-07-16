import { z } from "zod";

export const BanSchema = z.object({
    userId: z.string().min(17),
    username: z.string().min(1),
    authorityId: z.string().min(17),
    expiresAt: z.number().nullable(),
    createdTimestamp: z.number(),
    reason: z.string().nullable(),
});