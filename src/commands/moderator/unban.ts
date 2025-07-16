import client from "../../core/client.js";
import database from "../../core/database.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { Command } from "../../structures/command.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { getFirstMention } from "../../utils/message.js";

export default new Command({
    name: 'unban',
    description: 'Unban a user',
    usage: '!unban [ reply to a message | user ID ]',
    requiredAuthority: AuthorityLevel.Moderator,
    position: 3,
    async execute(message, args) {
        if (!args[0] && !message.reference?.messageId) return message.reply({ content: this.formatUsage() });

        const targetUser = await getFirstMention(message, { referenceId: message.reference?.messageId }).catch(err => null);
        if (!targetUser) return message.reply({ content: 'I could not find that user.' });

        try {
            const isBanned = await database.bans.fetch(targetUser.id);
            if (!isBanned) return message.reply({ content: 'That user is not banned.' });

            await database.bans.delete(targetUser.id);

            const executorAuthority = await database.authorities.fetch(message.author.id); // will be available in this context.
            client.emit(GlobalNetworkEvents.UserUnban, targetUser, executorAuthority!, isBanned);

            return message.reply({ content: `${targetUser.username} has been unbanned.` });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error occured.' });
        }
    }
});