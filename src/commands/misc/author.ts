import { Colors, EmbedBuilder } from "discord.js";
import database from "../../core/database.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { Command } from "../../structures/command.js";
import { ErrorHandler } from "../../structures/error-handler.js";

export default new Command({
    name: 'author',
    description: 'Get the author of a global message',
    usage: '!unban [ reply to a message | message ID ]',
    position: 2,
    requiredAuthority: AuthorityLevel.Moderator,

    async execute(message, args) {
        if (!args[0] && !message.reference?.messageId) return message.reply({ content: this.formatUsage() });

        const messageId = args[0] || message.reference?.messageId;
        const relayMessage = await database.relays.fetch(messageId!);
        if (!relayMessage) return message.reply({ content: 'I could not find a global message with that ID.' });

        const guild = await relayMessage.fetchGuild().catch(err => null);
        const guildInfo = guild ? `${guild.name} - ${guild.id}` : 'Unknown Guild.'

        const user = await relayMessage.fetchAuthor().catch(err => null);
        const userInfo = `<@${relayMessage.authorId}> (${user?.username || 'unknown'})`;

        const authority = await database.authorities.fetch(relayMessage.authorId);
        const authorityInfo = authority ? authority.level : 0;

        const url = relayMessage.getOriginURL();

        try {
            const embed = new EmbedBuilder()
                .setTitle('Global Relay Author')
                .setColor(Colors.Green)
                .setFields([
                    { name: 'Username:', value: userInfo },
                    { name: 'ID:', value: relayMessage.authorId },
                    { name: 'Guild:', value: guildInfo },
                    { name: 'Authority:', value: `${authorityInfo}` },
                    { name: 'URL:', value: url }
                ]);

            return message.reply({ embeds: [embed] });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error occured.' });
        }
    }
});