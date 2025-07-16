import { ChannelType, Events } from "discord.js";
import { Event, GlobalNetworkEvents } from "../structures/event.js";
import database from "../core/database.js";
import { buildRelayFromMessage, getMessagePayload, validateMessage } from "../utils/message.js";
import { GlobalRelayPriority, GlobalRelayQueue } from "../structures/queue.js";
import RelayHandler from "../services/relay-handler.js";
import { filter } from "../index.js";
import { ErrorHandler } from "../structures/error-handler.js";
import { RelayMessage } from "../structures/relay.js";
import client from "../core/client.js";

export default new Event(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (!newMessage.inGuild() || newMessage.channel.type !== ChannelType.GuildText || newMessage.author.bot || newMessage.webhookId) return;
    // afaik, there is no reason to update for anything other than the content
    if (!oldMessage.partial && oldMessage.content === newMessage.content) return;

    const connection = await database.connections.fetch(newMessage.guildId, { fetch: false });
    if (!connection || !connection.isEnabled() || !connection.isConnectionChannel(newMessage.channel.id)) return;

    const relayMessage = await database.relays.fetch(newMessage.id);
    if (!relayMessage) return;

    // secondary check.
    if (relayMessage.payload.content === newMessage.content) return;

    // validate content
    if (filter.isProfane(newMessage.content)) return newMessage.reply({ content: 'This message contains blocked content.' })

    if (!validateMessage(newMessage)) return newMessage.reply({ content: 'This message contains content that is not currently supported.' });

    const relayPayload = await buildRelayFromMessage(newMessage);
    const messagePayload = await getMessagePayload(newMessage);

    try {
        const connections = database.connections.cache.filter(c => c.channelId !== newMessage.channel.id && c.isRelayEligible());
        if (connections.size === 0) return;

        await GlobalRelayQueue.addTask(newMessage.id, GlobalRelayPriority.PostLowPriority, RelayHandler.updateRelay(relayMessage.references, relayPayload, connections));
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'message update', emitAlert: true });
    }

    // update payload
    try {
        // create a copy
        const oldRelayMessage: RelayMessage = Object.assign(
            Object.create(Object.getPrototypeOf(relayMessage)),
            structuredClone(relayMessage)
        );

        await database.relays.updatePayload(newMessage.id, messagePayload);

        client.emit(GlobalNetworkEvents.RelayUpdate, oldRelayMessage, relayMessage);
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'message update : database', emitAlert: true });
    }

})
