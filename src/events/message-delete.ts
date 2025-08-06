import { ChannelType, Events } from "discord.js";
import { Event, GlobalNetworkEvents } from "../structures/event.js";
import database from "../core/database.js";
import { GlobalRelayPriority, GlobalRelayQueue } from "../structures/queue.js";
import RelayHandler from "../services/relay-handler.js";
import { ErrorHandler } from "../structures/error-handler.js";
import client from "../core/client.js";

export default new Event(Events.MessageDelete, async (message) => {
    if (!message.inGuild() || message.channel.type !== ChannelType.GuildText) return;
    if (!message.partial && message.author.bot || message.webhookId) return;

    // early return for POSTS not yet processed.
    if (GlobalRelayQueue.hasPostTaskForId(message.id)) {
        return GlobalRelayQueue.removeTasks(message.id);
    }

    const connection = await database.connections.fetch(message.guildId, { fetch: false });
    if (!connection || !connection.isEnabled() || !connection.isConnectionChannel(message.channel.id)) return;

    const relayMessage = await database.relays.fetchByOrigin(message.id);
    if (!relayMessage) return;

    try {
        const connections = database.connections.cache.filter(c => !c.isConnectionChannel(relayMessage.channelId) && c.isRelayEligible() && relayMessage.references.has(c.channelId!));
        if (connections.size === 0) return;

        await GlobalRelayQueue.addTask(message.id, GlobalRelayPriority.PostLowPriority, () => RelayHandler.deleteRelay({ messages: relayMessage.references }, connections));
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'message-delete-event', emitAlert: true });
    }

    // delete the message from db
    try {
        // emit event
        client.emit(GlobalNetworkEvents.RelayDelete, relayMessage);

        await database.relays.delete(relayMessage.id);
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'message-delete-event', emitAlert: true });
    }
});