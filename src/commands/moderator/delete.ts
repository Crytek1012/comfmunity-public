import client from "../../core/client.js";
import database from "../../core/database.js";
import RelayHandler from "../../services/relay-handler.js";
import { AuthorityLevel } from "../../structures/authority.js";
import { Command } from "../../structures/command.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { GlobalRelayPriority, GlobalRelayQueue } from "../../structures/queue.js";

export default new Command({
    name: 'delete',
    description: 'Delete a relay message',
    usage: '!delete [ reply to a message ]',
    requiredAuthority: AuthorityLevel.Moderator,
    requireConnection: true,
    position: 1,
    async execute(message, args, connection) {
        if (!message.reference || !message.reference.messageId) return message.reply({ content: this.formatUsage() });

        const relayMessage = await database.relays.fetch(message.reference.messageId);
        if (!relayMessage) return message.reply({ content: 'I could not find a relay message with that ID.' });

        try {
            const connections = database.connections.cache.filter(c => c.isRelayEligible() && !c.isConnectionChannel(relayMessage.channelId) && relayMessage.references.has(c.channelId!));
            if (connections.size > 0) await GlobalRelayQueue.addTask(relayMessage.id, GlobalRelayPriority.ModDelete, RelayHandler.deleteRelay({ messages: relayMessage.references }, connections));
            await database.relays.delete(relayMessage.id);

            // delete origin
            const origin = await relayMessage.fetchOrigin().catch(err => null);
            if (origin) origin.delete().catch(err => null);

            const executorAuthority = await database.authorities.fetch(message.author.id); // will be available in this context.
            client.emit(GlobalNetworkEvents.RelayPurge, relayMessage, executorAuthority!)

            return message.reply({ content: `Relay message has been deleted.\nAuthor ID: ${relayMessage.authorId}` });
        }
        catch (err) {
            ErrorHandler.handle(err, { context: this.name, emitAlert: true });
            return message.reply({ content: 'An error occured.' });
        }
    }
});