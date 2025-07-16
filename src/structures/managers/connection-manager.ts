import { TextChannel, Webhook, WebhookType } from "discord.js";
import { ConnectionSchema } from "../../schemas/connection.js";
import { IRawConnectionData } from "../../types/database.js";
import { Connection, ConnectionData } from "../connection.js";
import { CollectionManager, defaultFetchOptions } from "./collection-manager.js";

export default class ConnectionManager extends CollectionManager<IRawConnectionData, Connection> {

    /**
     * Fetch a connection
     * @param guildId the id of the connection's guild
     * @returns 
     */
    async fetch(guildId: string, options = defaultFetchOptions): Promise<Connection | null> {
        const opt = { ...defaultFetchOptions, ...options };

        if (!guildId) throw new Error('The ID provided must be of type string.');
        const cached = this.cache.get(guildId);
        if (cached && opt.checkCache) return cached;

        const rawData = await this.collection.findOne({ guildId });
        if (!rawData) return null;

        const connection = new Connection(rawData);
        this.cache.set(connection.guildId, connection)
        return connection;
    }

    /**
     * Fetch all the connections
     * @returns 
     */
    async fetchAll(): Promise<Connection[]> {
        const rawArray = await this.collection.find().toArray();
        return rawArray.map(raw => {
            const connection = new Connection(raw);
            this.cache.set(connection.guildId, connection);
            return connection;
        });
    }

    /**
     * Create a new connection
     * @param data the connection's data
     */
    async create(data: ConnectionData) {
        const parsed = ConnectionSchema.safeParse(data);
        if (!parsed.success) {
            throw new Error(`Validation failed: ${parsed.error.message}`);
        }

        await this.collection.insertOne(parsed.data);
        const connection = new Connection(data);
        this.cache.set(data.guildId, connection);
        return connection;
    }

    /**
     * Delete a connection
     * @param guildId the ID of the connection
     */
    async delete(guildId: string) {
        if (!this.cache.has(guildId)) return;

        await this.collection.deleteOne({ guildId });
        this.cache.delete(guildId);
    }

    /**
     * Enable the connection
     * @param guildId the ID of the connection
     * @returns 
     */
    async enable(guildId: string) {
        const cached = this.getCached(guildId)
        if (cached.isEnabled()) return;

        await this.collection.updateOne({ guildId }, {
            $set: {
                enabled: true
            }
        });

        cached.enable();
    }

    /**
     * Disable the connection
     * @param guildId the ID of the connection
     * @returns 
     */
    async disable(guildId: string) {
        const cached = this.getCached(guildId)
        if (!cached.isEnabled()) return;

        await this.collection.updateOne({ guildId }, {
            $set: {
                enabled: false
            }
        });

        cached.disable();
    }

    /**
     * Update a connection's channel data
     * @param guildId the ID of the connection
     * @param channel the ID of the channel
     * @param webhook the new webhook
     */
    async updateChannelData(guildId: string, channel: TextChannel | null, webhook: Webhook<WebhookType.Incoming> | null) {
        const cached = this.getCached(guildId)
        if (channel && !(channel instanceof TextChannel)) throw new Error('Expected a Text Channel.');
        if (webhook && !(webhook instanceof Webhook)) throw new Error('Expected a Webhook.');

        await this.collection.updateOne({ guildId }, {
            $set: {
                channelId: channel?.id || null,
                webhookId: webhook?.id || null
            }
        });

        cached.setChannelData(channel, webhook);
    }

    /**
     * Update a connection's webhook data
     * @param guildId the ID of the connection
     * @param webhook the new webhook
     */
    async updateWebhookData(guildId: string, webhook: Webhook<WebhookType.Incoming> | null) {
        const cached = this.getCached(guildId)
        if (!(webhook instanceof Webhook) && webhook !== null) throw new Error('Expected a Webhook.');

        if (webhook && cached.channelId !== webhook.channelId) throw new Error('The provided webhook is not configured to the connection\'s channel.');
        await this.collection.updateOne({ guildId }, {
            $set: {
                webhookId: webhook?.id || null
            }
        });

        cached.setWebhookData(webhook);
    };

    /**
     * Update a connection's manager
     * @param guildId the ID of the connection
     * @param userId the ID of the user
     */
    async updateManager(guildId: string, userId: string) {
        await this.collection.updateOne({ guildId }, {
            $set: {
                managedBy: userId
            }
        });

        this.cache.get(guildId)?.setManager(userId);
    }
}