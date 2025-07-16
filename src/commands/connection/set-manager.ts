import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import client from "../../core/client.js";
import { isSnowflake } from "../../utils/util.js";

export default new Command({
    name: 'setmanager',
    description: 'Set a connection\'s manager',
    usage: '!setmanager [guild ID] [user ID]',
    requiredAuthority: AuthorityLevel.Owner,
    requiredArgs: 2,
    position: 5,
    async execute(message, args) {

        try {
            if (!isSnowflake(args[0]) || !isSnowflake(args[1])) return message.reply({ content: 'The arguments provided need to be valid IDs.' })

            const connection = await database.connections.fetch(args[0]);
            if (!connection) return message.reply({ content: 'I could not find a connection with that ID.' });

            if (connection.managedBy === args[1]) return message.reply({ content: 'The connection is already managed by that user.' });

            const user = await client.users.fetch(args[1]).catch(err => null);
            if (!user) return message.reply({ content: 'I could not find a user with that ID.' });

            await database.connections.updateManager(connection.guildId, user.id);

            return message.reply({ content: `**${user.displayName}** is now **${connection.guildName}**'s manager.` });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error has occured.' });
        }
    }
})