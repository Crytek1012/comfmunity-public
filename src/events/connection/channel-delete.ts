import { ChannelType, EmbedBuilder, Events } from "discord.js";
import { Event } from "../../structures/event.js";
import { Colors } from "../../utils/util.js";
import client from "../../core/client.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import database from "../../core/database.js";

export default new Event(Events.ChannelDelete, async (channel) => {
    if (channel.type != ChannelType.GuildText) return;

    const connection = database.connections.cache.get(channel.guild.id);
    if (!connection) return;

    if (!connection.isConnectionChannel(channel.id)) return;

    let deleted = false;
    try {
        await database.connections.delete(channel.guild.id);
        deleted = true;
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'channel-delete-event', connection: connection });
    }

    const severedStatus = deleted ? 'The connection has been deleted.' : 'Failed to delete the connection. A notice has been emitted.'
    const embed = new EmbedBuilder()
        .setTitle('Global Channel Deleted')
        .setDescription(`The global channel for the guild ${channel.guild.name} (${channel.guild.id}) has been deleted.\n\n${severedStatus}`)
        .setColor(Colors.Red)

    try {
        const modLogsChannel = await client.fetchModLogsChannel();
        modLogsChannel.send({ embeds: [embed] });
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'channel-delete-event', connection })
    }
});
