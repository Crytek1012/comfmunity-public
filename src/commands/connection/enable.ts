import { PermissionFlagsBits } from "discord.js";
import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import client from "../../core/client.js";
import { GlobalNetworkEvents } from "../../structures/event.js";

export default new Command({
    name: 'enable',
    description: 'Enable a connection',
    usage: '!enable',
    requiredPermissions: [PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageChannels],
    requiredAuthority: AuthorityLevel.Admin,
    requireConnection: true,
    position: 2,
    async execute(message, args, connection) {

        if (!connection.isManageable(message.author.id)) return message.reply({ content: 'You cannot manage this connection.' });
        if (connection.isEnabled()) return message.reply({ content: 'The connection is already enabled!' });

        try {

            await database.connections.enable(message.guild.id);

            const executorAuthority = await database.authorities.fetch(message.author.id); // available in this context
            client.emit(GlobalNetworkEvents.ConnectionEnable, connection, executorAuthority!);

            return message.reply({ content: 'The connection has been enabled.' });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error has occured.' });
        }
    }
})