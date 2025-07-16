import { Client } from "discord.js";
import { config } from "../config.js";
import { isSnowflake } from "./util.js";

export async function validateRuntimeConfig(client: Client): Promise<void> {
    if (!isSnowflake(config.ownerId)) throw new Error('Invalid Owner ID configured.');

    const owner = await client.users.fetch(config.ownerId, { cache: true }).catch(() => null);
    if (!owner) throw new Error('The configured owner could not be fetched.');

    const validateChannel = async (id: string, label: string) => {
        const channel = await client.channels.fetch(id).catch(() => null);
        if (!channel?.isTextBased()) {
            throw new Error(`Invalid ${label} ID: must be a text-based channel`);
        }
    };

    await Promise.all([
        validateChannel(config.alertChannelId, 'Alert Channel'),
        validateChannel(config.messageLogsChannelId, 'Message Logs Channel'),
        validateChannel(config.modLogsChannelId, 'Mod Logs Channel'),
    ]);
}