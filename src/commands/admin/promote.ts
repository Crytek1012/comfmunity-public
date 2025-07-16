import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import { AssignableAuthorityLevels, AuthorityLevel, AuthorityLevelMap } from "../../structures/authority.js";
import client from "../../core/client.js";
import { isSnowflake } from "../../utils/util.js";
import { ErrorHandler } from "../../structures/error-handler.js";

export default new Command({
    name: 'promote',
    description: 'Promote a user to an authority',
    usage: `!promote [ user ID ] [ ${AssignableAuthorityLevels.join(' | ')} ]`,
    requiredAuthority: AuthorityLevel.Owner,
    requiredArgs: 2,
    position: 1,
    async execute(message, args) {

        const [userId, level] = args;
        if (!isSnowflake(userId)) return message.reply({ content: 'The ID provided is invalid.' });

        const user = await client.users.fetch(userId).catch(err => null);
        if (!user) return message.reply({ content: 'No user found with that ID.' });

        const targetLevel = AuthorityLevelMap[level];
        if (!targetLevel) return message.reply({ content: `The provided level is not valid. Levels are: ${AssignableAuthorityLevels.join(' | ')}` });
        if (targetLevel > AuthorityLevel.Admin) return message.reply({ content: 'The level you are trying to assign is above the maximum assignable level.' });

        const targetAuthority = await database.authorities.fetch(userId);
        if (targetAuthority?.level === targetLevel) return message.reply({ content: 'This authority already has that authority level.' });
        if ((targetAuthority?.level || 0) > targetLevel) return message.reply({ content: 'This authority has a higher level than the one provided.' });

        try {

            if (targetAuthority) {
                await database.authorities.updateLevel(targetAuthority.userId, targetLevel)
            }
            else {
                await database.authorities.create({
                    userId: user.id,
                    username: user.username,
                    level: targetLevel,
                    hidden: false,
                    user: user,
                    createdTimestamp: Date.now()
                })
            }

            return message.reply({ content: `User **${user.displayName}** (${user.id}) has been promoted to ${level}` });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error has occured.' });
        }
    }
})