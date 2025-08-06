import { Message } from "discord.js";
import { filter } from "../index.js";
import { buildRelayFromMessage, getMessagePayload, validateMessage } from "../utils/message.js";
import { GlobalRelayPriority, GlobalRelayQueue } from "../structures/queue.js";
import RelayHandler from "./relay-handler.js";
import { ErrorHandler } from "../structures/error-handler.js";
import database from "../core/database.js";

export async function handleRelayMessage(message: Message<true>) {
    const connection = await database.connections.fetch(message.guildId, { fetch: false });
    if (!connection || !connection.isRelayEligible() || !connection.isConnectionChannel(message.channel.id)) return;

    // ignore banned users
    const isBanned = await database.bans.fetch(message.author.id);
    if (isBanned) return;

    // validate content
    if (filter.isProfane(message.content)) {
        message.reply({ content: 'This message contains blocked content.' });
        return;
    }

    // validate message
    if (!validateMessage(message)) {
        message.reply({ content: 'This message contains content that is not currently supported.' });
        return;
    }

    try {
        const connections = database.connections.cache.filter(c => c.channelId !== message.channel.id && c.isRelayEligible());
        if (connections.size === 0) return;

        const relayPayload = await buildRelayFromMessage(message);
        const messagePayload = await getMessagePayload(message);

        const result = await GlobalRelayQueue.addTask(message.id, GlobalRelayPriority.PostLowPriority, () => RelayHandler.relayMessage(relayPayload, connections));

        await database.relays.create({
            id: message.id,
            guildId: message.guildId,
            channelId: message.channelId,
            authorId: message.author.id,
            references: result.filter((r): r is { channelId: string; messageId: string } => r !== null),
            payload: messagePayload
        });

    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'relay-message', emitAlert: true });
    }
}