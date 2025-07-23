import { EmbedBuilder } from "@discordjs/builders";
import { Event } from "../../structures/event.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { Colors } from "../../utils/util.js";
import client from "../../core/client.js";
import { config } from "../../config.js";
import { ErrorHandler } from "../../structures/error-handler.js";

export default new Event(GlobalNetworkEvents.UserUnban, async (user, authority, banData) => {
    if (!config.modLogsChannelId) return;

    const username = user?.username || banData.username;
    const userId = banData.userId;
    const authorityData = authority ? `${authority.user?.displayName || authority.username} (${authority.userId})` : `<@${banData.authorityId}> (${banData.authorityId})`;

    const embed = new EmbedBuilder()
        .setTitle('User Unbanned')
        .setColor(Colors.Green)
        .setFields(
            { name: 'Username', value: username },
            { name: 'ID', value: userId },
            { name: 'Authority', value: authorityData }
        )

    if (banData.expiresAt && banData.expiresAt < Date.now()) embed.addFields({ name: 'Notice', value: 'Ban expired.' })

    try {
        const modLogsChannel = await client.fetchModLogsChannel();
        modLogsChannel.send({ embeds: [embed] });
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'user-unban-event' })
    }
})
