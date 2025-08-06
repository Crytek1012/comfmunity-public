import { EmbedBuilder } from "discord.js";
import { config } from "../../config.js";
import client from "../../core/client.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { Event } from "../../structures/event.js";
import { Colors } from "../../utils/util.js";
import database from "../../core/database.js";

export default new Event(GlobalNetworkEvents.RelayUpdate, async (oldRelayMessage, newRelayMessage) => {
    if (!config.messageLogsChannelId) return;

    const mainConnection = config.mainConnectionId ? await database.connections.fetch(config.mainConnectionId, { fetch: false }) : null;
    const relayUrl = mainConnection?.channelId ? newRelayMessage.getConnectionURL(mainConnection.guildId, mainConnection.channelId) : 'Could not generate URL.';

    const embed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setTitle('Message Update')
        .addFields(
            { name: 'User', value: `<@${newRelayMessage.authorId}> (${newRelayMessage.payload.username} ${newRelayMessage.authorId})` },
            { name: 'Old Content', value: oldRelayMessage.payload.content || 'Couldn\'t get old content.' }, // neither should happen
            { name: 'New Content', value: newRelayMessage.payload.content || 'Couldn\'t get new content.' }, // neither should happen
            { name: 'Message Link', value: relayUrl } // maybe this should link to the origin?
        )
        .setFooter({ text: `Message ID: ${newRelayMessage.id}` })

    try {
        (await client.fetchMessageLogsChannel()).send({
            embeds: [embed],
            allowedMentions: { parse: [] }
        });
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'relay-update-event', emitAlert: true });
    }

});