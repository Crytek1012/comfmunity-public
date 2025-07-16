import { PermissionFlagsBits } from "discord.js";
import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import client from "../../core/client.js";
import { GlobalNetworkEvents } from "../../structures/event.js";

export default new Command({
    name: 'disconnect',
    description: 'Disconnect a server from the Network',
    usage: '!disconnect',
    requiredPermissions: [PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageChannels],
    requiredAuthority: AuthorityLevel.Admin,
    requireConnection: true,
    position: 6,
    async execute(message, args, connection) {

        if (!connection.isManageable(message.author.id)) return message.reply({ content: 'You cannot manage this connection.' });

        try {
            const webhook = await connection.fetchWebhook().catch(err => null);
            await database.connections.delete(message.guild.id);
            if (webhook) webhook.delete().catch(err => null);

            const executorAuthority = await database.authorities.fetch(message.author.id); // available in this context
            client.emit(GlobalNetworkEvents.ConnectionDelete, connection, executorAuthority!);

            return message.reply({ content: 'The server has been disconnected.' });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error has occured.' });
        }
    }
})