import { z } from "zod";

export const ConnectionSchema = z.object({
    guildId: z.string().min(17),
    guildName: z.string().min(1),
    channelId: z.string().min(17),
    webhookId: z.string().min(17),
    managedBy: z.string().min(17),
    enabled: z.boolean(),
    createdTimestamp: z.number()
});