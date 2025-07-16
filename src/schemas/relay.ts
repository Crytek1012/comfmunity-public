import { z } from "zod";

export const RelaySchema = z.object({
    id: z.string().min(17),
    guildId: z.string().min(17),
    channelId: z.string().min(17),
    authorId: z.string().min(17),
    references: z.array(z.object({
        channelId: z.string().min(17),
        messageId: z.string().min(17)
    })
    ),
    payload: z.object({
        username: z.string().min(1),
        avatarUrl: z.string().min(1),
        content: z.string().min(1).optional(),
        attachments: z.array(z.string().min(1)).optional(),
        files: z.array(z.string().min(1)).optional(),
        mention: z.object({
            guildId: z.string().min(17),
            userId: z.string().min(17)
        }).optional()
    })
});