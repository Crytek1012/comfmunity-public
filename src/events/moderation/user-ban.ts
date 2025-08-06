import { EmbedBuilder } from "@discordjs/builders";
import { Event } from "../../structures/event.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { Colors } from "../../utils/util.js";
import client from "../../core/client.js";
import { config } from "../../config.js";
import { ErrorHandler } from "../../structures/error-handler.js";

export default new Event(GlobalNetworkEvents.UserBan, async (user, authority, banData) => {
    if (!config.modLogsChannelId) return;

    const banExpirationDate = banData.expiresAt ? `<t:${Math.floor(banData.expiresAt / 1000)}:R>` : 'never.'
    const embed = new EmbedBuilder()
        .setTitle('User Banned')
        .setColor(Colors.Red)
        .setFields(
            { name: 'Username', value: user.username, },
            { name: 'ID', value: user.id },
            { name: 'Authority', value: `${authority.user?.displayName || authority.username} (${authority.userId})` },
            { name: 'Duration', value: banExpirationDate },
            { name: 'Reason', value: banData.reason || '`None Provided.`' }
        )

    try {
        const modLogsChannel = await client.fetchModLogsChannel();
        modLogsChannel.send({ embeds: [embed] });
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'user-ban-event' })
    }
})
