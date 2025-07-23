import { ChannelType, Colors, EmbedBuilder, Events } from "discord.js"
import { Event } from "../../structures/event.js"
import { ErrorHandler } from "../../structures/error-handler.js";
import database from "../../core/database.js";
import client from "../../core/client.js";

export default new Event(Events.WebhooksUpdate, async (channel) => {
    if (channel.type !== ChannelType.GuildText) return;

    const connection = await database.connections.fetch(channel.guildId);
    if (!connection || !connection.webhookId || connection.channelId !== channel.id) return;

    const webhook = await connection.fetchWebhook(true).catch(() => null);
    if (webhook) return;

    try {
        await database.connections.updateWebhookData(connection.guildId, null);
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'webhook-update-event', connection });
    }

    const embed = new EmbedBuilder()
        .setTitle('Webhook Deleted')
        .setColor(Colors.Red)
        .setDescription(`The webhook for the connection **${connection.guildName}** (${connection.guildId}) has been deleted.`)

    try {
        const modLogsChannel = await client.fetchModLogsChannel();
        modLogsChannel.send({ embeds: [embed] });
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'webhook-update-event', connection })
    }

})