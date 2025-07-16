import { z } from "zod";

export const AuthoritySchema = z.object({
    userId: z.string().min(17),
    username: z.string().min(1),
    level: z.number(),
    hidden: z.boolean(),
    createdTimestamp: z.number()
});