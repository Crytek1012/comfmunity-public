import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import { AuthorityLevel, AuthorityLevelMap } from "../../structures/authority.js";
import client from "../../core/client.js";
import { isSnowflake } from "../../utils/util.js";
import { ErrorHandler } from "../../structures/error-handler.js";

export default new Command({
    name: 'demote',
    description: 'Decrease a user\'s authority level',
    usage: '!demote [ user ID ] ( level )',
    requiredAuthority: AuthorityLevel.Owner,
    requiredArgs: 1,
    position: 2,
    async execute(message, args) {

        const [userId, level] = args;
        if (!isSnowflake(userId)) return message.reply({ content: 'The ID provided is invalid.' });

        const user = await client.users.fetch(userId).catch(err => null);
        if (!user) return message.reply({ content: 'No user found with that ID.' });

        const targetAuthority = await database.authorities.fetch(userId);
        if (!targetAuthority) return message.reply({ content: 'This user is not an authority.' });

        if (level && !AuthorityLevelMap[level]) return message.reply({ content: `The provided level is not valid. (${Object.values(AuthorityLevel).filter(v => typeof v === 'string').join(', ')})` });
        const targetLevel = AuthorityLevelMap[level];

        if (targetLevel && targetLevel > targetAuthority.level) return message.reply({ content: 'This user has a lower authority level than the one provided.' });
        if (targetLevel && targetLevel === targetAuthority.level) return message.reply({ content: 'This user already has that authority level.' });

        try {

            if (targetLevel >= AuthorityLevel.Moderator) {
                await database.authorities.updateLevel(targetAuthority.userId, targetLevel);
                return message.reply({ content: `User **${user.displayName}** (${user.id}) has been demoted to the level: ${AuthorityLevel[targetLevel]}` })
            }
            else {
                await database.authorities.delete(user.id)
                return message.reply({ content: `User **${user.displayName}** (${user.id}) is no longer an authority.` });
            }
        }
        catch (err) {
            ErrorHandler.handle(err as Error)
            return message.reply({ content: 'An error has occured.' });
        }
    }
})