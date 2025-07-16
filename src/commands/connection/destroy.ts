import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import client from "../../core/client.js";
import { GlobalNetworkEvents } from "../../structures/event.js";

export default new Command({
    name: 'destroy',
    description: 'Remove a connection from the network',
    usage: '!destroy [guild ID]',
    requiredAuthority: AuthorityLevel.Owner,
    requiredArgs: 1,
    position: 7,
    async execute(message, args) {

        try {
            const connection = await database.connections.fetch(args[0]);
            if (!connection) return message.reply({ content: 'I could not find a connection with that ID.' });

            const webhook = await connection.fetchWebhook().catch(err => null);
            await database.connections.delete(connection.guildId);
            if (webhook) webhook.delete().catch(err => null);

            const executorAuthority = await database.authorities.fetch(message.author.id); // available in this context
            client.emit(GlobalNetworkEvents.ConnectionDestroy, connection, executorAuthority!);

            return message.reply({ content: 'The connection has been destroyed.' });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error has occured.' });
        }
    }
})