import { EmbedBuilder } from "@discordjs/builders";
import { Event } from "../../structures/event.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { Colors } from "../../utils/util.js";
import client from "../../core/client.js";
import { config } from "../../config.js";
import { ErrorHandler } from "../../structures/error-handler.js";

export default new Event(GlobalNetworkEvents.ConnectionDisable, async (connection, authority) => {
    if (!config.modLogsChannelId) return;

    const embed = new EmbedBuilder()
        .setTitle('Connection Disabled')
        .setColor(Colors.Red)
        .setThumbnail(connection.guild?.iconURL() || null)
        .setFields(
            { name: 'Guild', value: connection.guildName },
            { name: 'ID', value: connection.guildId },
            { name: 'Authority', value: `${authority.user?.displayName || authority.username} (${authority.userId})` }
        )

    try {
        const modLogsChannel = await client.fetchModLogsChannel();
        modLogsChannel.send({ embeds: [embed] });
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'connection-disable-event', connection })
    }
})
