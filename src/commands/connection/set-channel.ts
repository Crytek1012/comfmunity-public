import { ChannelType, PermissionFlagsBits } from "discord.js";
import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import client from "../../core/client.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { Connection } from "../../structures/connection.js";
import { BasePermissions } from "../../utils/util.js";

export default new Command({
    name: 'setchannel',
    description: 'Change a connection\'s channel',
    usage: '!setchannel [#channel]',
    requiredPermissions: [PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageChannels],
    requiredAuthority: AuthorityLevel.Admin,
    requireConnection: true,
    requiredArgs: 1,
    position: 4,
    async execute(message, args, connection) {

        if (!connection.isManageable(message.author.id)) return message.reply({ content: 'You cannot manage this connection.' });
        const targetChannel = message.mentions.channels.first() || client.channels.cache.get(args[0]);
        if (!targetChannel) return message.reply({ content: 'The channel you provided is invalid.' });
        if (targetChannel.type !== ChannelType.GuildText) return message.reply({ content: 'The channel\'s type must be Text Channel.' });

        const missingPermissions = targetChannel.permissionsFor(message.guild.members.me!).missing(BasePermissions);
        if (missingPermissions.length > 0) {
            return message.reply({ content: `I'm missing the following permissions in that channel: ${missingPermissions.map(p => `\`${p}\``).join(', ')}` })
        }

        try {
            const oldConnection = new Connection(connection);
            const oldWebhook = await oldConnection.fetchWebhook().catch(() => null);

            const newWebhook = await client.createChannelWebhook(targetChannel);
            await database.connections.updateChannelData(targetChannel.guild.id, targetChannel, newWebhook);

            if (oldWebhook) oldWebhook.delete(`Connection channel moved to ${targetChannel.name}`).catch(() => null);

            const executorAuthority = await database.authorities.fetch(message.author.id); // available in this context
            client.emit(GlobalNetworkEvents.ConnectionUpdate, oldConnection, connection, executorAuthority!);

            return message.reply({ content: `The connection's channel has been moved to ${targetChannel.name}` });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error has occured.' });
        }
    }
})