import { Collection, MessageFlags, RawFile, RESTPatchAPIWebhookResult, RESTPostAPIChannelWebhookResult, RESTPostAPIWebhookWithTokenJSONBody, Routes, Webhook } from "discord.js";
import { RelayDELETEData, RelayMessageResolvables, RelayPayload } from "../types/relay-handler.js";
import { Connection } from "../structures/connection.js";
import database from "../core/database.js";
import client from "../core/client.js";
import { getReferenceButton } from "../utils/message.js";
import { ErrorHandler } from "../structures/error-handler.js";

interface RelayPOSTPayload {
    body: RESTPostAPIWebhookWithTokenJSONBody;
    files: RawFile[];
    query: URLSearchParams;
    auth: boolean,
}

export default class RelayHandler {
    private constructor() { }

    private static buildPayload(data: RelayPayload): RelayPOSTPayload {
        const { username, avatarUrl, files = [], mentions, components } = data;

        const body = {
            username,
            avatar_url: avatarUrl,
            allowed_mentions: mentions ? { users: mentions } : { parse: [] },
            components,
            flags: MessageFlags.IsComponentsV2
        } as RESTPostAPIWebhookWithTokenJSONBody;

        const queryFiles = files.map(file => ({
            data: Buffer.from(file.data.data),
            name: file.name,
        }));

        return {
            body,
            files: queryFiles,
            query: new URLSearchParams({ wait: 'true', with_components: 'true' }),
            auth: true
        }
    }

    private static isRelayEligible(connection: Connection): connection is Connection & { channelId: string; webhookId: string; webhook: Webhook } {
        return connection.isRelayEligible();
    }

    static async relayMessage(data: RelayPayload, targetConnections?: Collection<string, Connection>) {
        const payload = this.buildPayload(data);
        const { body, files, query } = payload;

        const connections = targetConnections?.filter(this.isRelayEligible) || database.connections.cache.filter(this.isRelayEligible)
        if (connections.size === 0) throw new Error('The number of connections needs to be higher than 0.')

        const results = await Promise.all(connections.map(async connection => {

            const isReferenceGuild = data.reference?.mention?.guildId === connection.guildId
            const newBody = {
                ...body,
                components: [...(body.components ?? [])]
            };

            // reply buttons and user reply have to be managed per connection
            if (data.reference) {
                const referenceButton = getReferenceButton(data.reference, connection.channelId, connection.guildId, data.reference.authorUsername);
                if (referenceButton) newBody.components?.push(referenceButton as any);

                // add mention container at the top
                if (isReferenceGuild) newBody.components?.unshift(data.reference.mention.container as any)
            }

            try {
                const webhook = await connection.fetchWebhook();

                const message = await client.rest.post(Routes.webhook(webhook.id, webhook.token), {
                    body: newBody,
                    files,
                    query,
                    auth: true,
                }) as RESTPostAPIChannelWebhookResult;

                return { channelId: message.channel_id, messageId: message.id };
            }
            catch (err) {
                ErrorHandler.handle(err, { context: this.name, connection });
                return null;
            }
        }));

        return results.filter(r => r !== null);
    }

    static async updateRelay(messages: RelayMessageResolvables, data: RelayPayload, targetConnections?: Collection<string, Connection>) {
        const payload = this.buildPayload(data);
        const { body, files, query } = payload;

        const connections = targetConnections?.filter(this.isRelayEligible) || database.connections.cache.filter(this.isRelayEligible)
        if (connections.size === 0) throw new Error('The number of connections needs to be higher than 0.')

        const results = await Promise.all(connections.map(async connection => {

            const isReferenceGuild = data.reference?.mention?.guildId === connection.guildId
            const newBody = {
                ...payload.body,
                components: [...(payload.body.components ?? [])]
            };

            // reply buttons and user mention have to be managed per connection
            if (data.reference) {
                const referenceButton = getReferenceButton(data.reference, connection.channelId, connection.guildId, data.reference.authorUsername);
                if (referenceButton) newBody.components?.push(referenceButton as any);

                // add mention container at the top
                if (isReferenceGuild) newBody.components?.unshift(data.reference.mention.container as any)
            }

            try {
                const targetMessageId = messages.get(connection.channelId)?.messageId;
                if (!targetMessageId) throw new Error(`Received an ID without a valid connection channel.`);

                const webhook = await connection.fetchWebhook();
                if (!webhook) return null;

                const message = await client.rest.patch(Routes.webhookMessage(webhook.id, webhook.token, targetMessageId), {
                    body,
                    files,
                    query,
                    auth: true,
                }) as RESTPatchAPIWebhookResult;

                return { channelId: message.channel_id, messageId: message.id };
            }
            catch (err) {
                ErrorHandler.handle(err, { context: this.name, connection });
                return null;
            }

        }));

        return results.filter(r => r !== null);
    }

    static async deleteRelay(data: RelayDELETEData, targetConnections: Collection<string, Connection>) {

        const connections = targetConnections?.filter(this.isRelayEligible);
        if (connections.size === 0) throw new Error('The number of connections needs to be higher than 0.')

        const results = await Promise.all(connections.map(async connection => {

            try {
                const targetMessageId = data.messages.get(connection.channelId)?.messageId;
                if (!targetMessageId) throw new Error(`Received an ID without a valid connection channel.`);

                const webhook = await connection.fetchWebhook();
                if (!webhook) return null;

                await client.rest.delete(Routes.webhookMessage(webhook.id, webhook.token, targetMessageId), {
                    auth: true,
                });

                return { messageId: targetMessageId };
            }
            catch (err) {
                ErrorHandler.handle(err, { context: this.name, connection });
                return null;
            }

        }));

        return results.filter(r => r !== null);
    }
}