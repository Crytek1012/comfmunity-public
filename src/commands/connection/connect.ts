import client from "../../core/client.js";
import database from "../../core/database.js";
import { PermissionFlagsBits, TextChannel } from "discord.js";
import { Command } from "../../structures/command.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { BasePermissions } from "../../utils/util.js";

export default new Command({
    name: 'connect',
    description: 'Connect a server to the Network',
    usage: '!connect',
    requiredPermissions: [PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageChannels],
    requiredAuthority: AuthorityLevel.Admin,
    position: 1,
    async execute(message, args) {

        const isConnected = database.connections.cache.get(message.guild.id);
        if (isConnected) return message.reply({ content: 'This server is already connected!' });

        const missingPermissions = message.channel.permissionsFor(message.guild.members.me!).missing(BasePermissions);
        if (missingPermissions.length > 0) {
            return message.reply({ content: `I'm missing the following permissions in this channel: ${missingPermissions.map(p => `\`${p}\``).join(', ')}` })
        }

        try {
            const webhook = await client.createChannelWebhook(message.channel as TextChannel);

            const connection = await database.connections.create({
                guildId: message.guild.id,
                guildName: message.guild.name,
                channelId: message.channel.id,
                webhookId: webhook.id,
                createdTimestamp: Date.now(),
                enabled: false,
                guild: message.guild,
                managedBy: message.author.id,
                channel: message.channel as TextChannel,
                webhook: webhook
            });

            const executorAuthority = await database.authorities.fetch(message.author.id); // available in this context
            client.emit(GlobalNetworkEvents.ConnectionCreate, connection, executorAuthority!);

            return message.reply({ content: 'The connection has been established.' });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error has occured.' });
        }
    }
})