import { ChannelType, Events } from "discord.js";
import { Event } from "../structures/event.js";
import { config } from "../config.js";
import client from "../core/client.js";
import database from "../core/database.js";
import RelayHandler from "../services/relay-handler.js";
import { buildRelayFromMessage, getMessagePayload, validateMessage } from "../utils/message.js";
import { GlobalRelayPriority, GlobalRelayQueue } from "../structures/queue.js";
import { filter } from "../index.js";
import { ErrorHandler } from "../structures/error-handler.js";

export default new Event(Events.MessageCreate, async (message) => {
    if (!message.inGuild() || message.channel.type !== ChannelType.GuildText || message.author.bot || message.webhookId) return;
    if (message.system) return;

    const args = message.content.toLowerCase().slice(config.prefix.length).split(/ +/);
    const query = args.shift()?.toLowerCase();

    const command = message.content.toLowerCase().startsWith(config.prefix) && query ? client.commands.getCommand(query) : null;

    // It's a relay message
    if (!command) {
        const connection = await database.connections.fetch(message.guildId, { fetch: false });
        if (!connection || !connection.isEnabled() || !connection.isConnectionChannel(message.channel.id)) return;

        // ignore banned users
        const isBanned = await database.bans.fetch(message.author.id);
        if (isBanned) return;

        // validate content
        if (filter.isProfane(message.content)) return message.reply({ content: 'This message contains blocked content.' })

        // validate message
        if (!validateMessage(message)) return message.reply({ content: 'This message contains content that is not currently supported.' });

        const relayPayload = await buildRelayFromMessage(message);
        const messagePayload = await getMessagePayload(message);

        try {
            const connections = database.connections.cache.filter(c => c.channelId !== message.channel.id && c.isRelayEligible());
            if (connections.size === 0) return;

            const result = await GlobalRelayQueue.addTask(message.id, GlobalRelayPriority.PostLowPriority, RelayHandler.relayMessage(relayPayload, connections));

            await database.relays.create({
                id: message.id,
                guildId: message.guildId,
                channelId: message.channelId,
                authorId: message.author.id,
                references: result.filter((r): r is { channelId: string; messageId: string } => r !== null),
                payload: messagePayload
            });

        }
        catch (err) {
            ErrorHandler.handle(err, { context: 'message create', emitAlert: true });
        }
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