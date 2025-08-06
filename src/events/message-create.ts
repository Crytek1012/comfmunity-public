import { ChannelType, Events } from "discord.js";
import { Event } from "../structures/event.js";
import { config } from "../config.js";
import client from "../core/client.js";
import database from "../core/database.js";
import { ErrorHandler } from "../structures/error-handler.js";
import { handleRelayMessage } from "../services/handle-relay-message.js";

export default new Event(Events.MessageCreate, async (message) => {
    if (!message.inGuild() || message.channel.type !== ChannelType.GuildText || message.author.bot || message.webhookId) return;
    if (message.system) return;

    const args = message.content.toLowerCase().slice(config.prefix.length).split(/ +/);
    const query = args.shift()?.toLowerCase();

    const command = message.content.toLowerCase().startsWith(config.prefix) && query ? client.commands.getCommand(query) : null;

    // It's a relay message
    if (!command) {
        return handleRelayMessage(message).catch(err => ErrorHandler.handle(err, { context: Events.MessageCreate }));
    }
    // it's a command
    else {
        // validate authority
        const authority = await database.authorities.fetch(message.author.id);
        if (command.requiredAuthority > (authority?.level || 0)) return message.reply({ content: 'This command requires a higher authority than the one you have.' });

        // validate bot + member permissions
        if (command.requiredPermissions.length > 0) {
            const clientMember = await message.guild.members.fetchMe();
            const clientMissingPerms = command.compareMemberPermissions(clientMember);
            if (clientMissingPerms.length > 0) return message.reply({ content: `I am missing the following permission(s): \`${clientMissingPerms.join(', ')}\`` });

            const guildMember = message.member || await message.guild.members.fetch(message.author.id);
            const userMissingPermissions = command.compareMemberPermissions(guildMember);
            if (userMissingPermissions.length > 0) return message.reply({ content: `You are missing the following permission(s): \`${userMissingPermissions.join(', ')}\`` });
        }

        // validate args
        if (command.requiredArgs > args.length) return message.reply({ content: command.formatUsage() });

        try {
            // validate connection
            if (command.requireConnection) {
                const connection = await database.connections.fetch(message.guild.id);
                if (!connection) return message.reply({ content: 'This server is not connected to the Network.' });

                command.execute(message, args, connection)
            }
            else {
                command.execute(message, args, null)
            }
        }
        catch (err) {
            ErrorHandler.handle(err, { context: 'message create', emitAlert: true });
            return message.reply({ content: 'An error occured.' });
        }
    }

});