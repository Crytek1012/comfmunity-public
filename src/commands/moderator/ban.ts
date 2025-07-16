import timestring from "timestring";
import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import { getFirstMention } from "../../utils/message.js";
import { regexes } from "../../utils/util.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import client from "../../core/client.js";
import { GlobalNetworkEvents } from "../../structures/event.js";

export default new Command({
    name: 'ban',
    description: 'Ban a user',
    usage: '!ban [ reply to a message | user ID ] ( duration ) ( reason )',
    requiredAuthority: AuthorityLevel.Moderator,
    position: 2,
    async execute(message, args) {
        if (!args[0] && !message.reference?.messageId) return message.reply({ content: this.formatUsage() });

        const targetUser = await getFirstMention(message, { referenceId: message.reference?.messageId }).catch(err => null);
        if (!targetUser) return message.reply({ content: 'I could not find that user.' });

        const executorAuthority = await database.authorities.fetch(message.author.id); // will be available in this context.
        const targetAuthority = await database.authorities.fetch(targetUser.id);
        if (targetAuthority && targetAuthority.level > executorAuthority!.level) return message.reply({ content: 'You cannot ban a user with a higher authority.' });

        const isBanned = await database.bans.fetch(targetUser.id);
        if (isBanned) {
            const banDuration = isBanned.expiresAt ? `<t:${Math.floor(isBanned.expiresAt / 1000)}:R>` : 'never.'
            return message.reply({ content: `That user is already banned.\nExpires: ${banDuration}` });
        }

        const rawContent = this.removeCallArgs(message.content);
        const duration = rawContent.match(regexes.duration)?.[0] || '';
        const reason = (!message.reference?.messageId ? rawContent.slice(args[0].length) : rawContent).replace(duration, '').trim() || null;

        try {
            const expiresAt = duration ? timestring(duration.replaceAll('and', ''), 'ms') + Date.now() : null;

            await database.bans.create({
                userId: targetUser.id,
                username: targetUser.username,
                authorityId: executorAuthority!.userId,
                expiresAt,
                createdTimestamp: Date.now(),
                reason,
            });

            client.emit(GlobalNetworkEvents.UserBan, targetUser, executorAuthority!, database.bans.cache.get(targetUser.id)!);

            return message.reply({ content: `${targetUser.username} has been banned.` });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error occured.' });
        }
    }
});