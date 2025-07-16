import { Guild, TextChannel, Webhook, WebhookType } from "discord.js";
import client from "../core/client.js";
import { config } from "../config.js";

export interface ConnectionData {
    guildId: string;
    guildName: string;
    guild?: Guild | null;
    channelId: string | null;
    channel?: TextChannel | null;
    webhookId: string | null;
    webhook?: Webhook | null;
    managedBy: string;
    enabled: boolean;
    createdTimestamp: number;
}

export class Connection {
    guildId: string;
    guildName: string;
    guild: Guild | null = null;
    channelId: string | null;
    channel: TextChannel | null = null;
    webhookId: string | null;
    webhook: Webhook<WebhookType.Incoming> | null = null;
    managedBy: string;
    enabled: boolean;
    createdTimestamp: number;

    constructor({ guildId, guildName, guild, channelId, channel, webhookId, webhook, managedBy, enabled, createdTimestamp }: ConnectionData) {
        this.guildId = guildId;
        this.guildName = guildName;
        this.guild = guild || client.guilds.cache.get(this.guildId) || null;
        this.channelId = channelId;
        this.channel = channel || (this.channelId ? client.channels.cache.get(this.channelId) as TextChannel : null);
        this.webhookId = webhookId;
        this.webhook = webhook as Webhook<WebhookType.Incoming> || null;
        this.managedBy = managedBy;
        this.enabled = enabled;
        this.createdTimestamp = createdTimestamp;
    }

    /**
     * Fetch the connection's guild
     * @returns 
     */
    async fetchGuild() {
        if (!this.guild) this.guild = await client.guilds.fetch(this.guildId);
        return this.guild;
    }

    /**
     * Fetch the connection's channel
     * @returns 
     */
    async fetchChannel() {
        if (!this.channelId) return null;
        if (!this.channel) this.channel = await client.channels.fetch(this.channelId) as TextChannel;
        return this.channel;
    }

    /**
     * Fetch the connection's webhook
     * @param checkCache whether to check the cache
     * @returns 
     */
    async fetchWebhook(checkCache = true) {
        if (!this.webhookId) throw new Error(`The connection ${this.guildName} (${this.guildId}) has no webhook configured.`);
        if (this.webhook && checkCache) return this.webhook;

        const webhook = await client.fetchWebhook(this.webhookId);
        this.webhook = webhook as Webhook<WebhookType.Incoming>
        return this.webhook;
    }

    /**
     * Enable the conenction
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable the connection
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Whether the connection is enabled
     * @returns 
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Whether the provided channel ID is this connection's channel ID
     * @param channelId
     * @returns 
     */
    isConnectionChannel(channelId: string) {
        return this.channelId === channelId;
    }

    /**
     * Whether this connection can receive relays
     * @returns 
     */
    isRelayEligible() {
        return !!this.channelId && !!this.webhookId && this.isEnabled();
    }


    /**
     * Set the connection's channel data
     * @param channel the channel
     * @param webhook the webhook
     */
    setChannelData(channel: TextChannel | null, webhook: Webhook<WebhookType.Incoming> | null) {
        this.channelId = channel?.id || null;
        this.channel = channel;
        this.webhookId = webhook?.id || null;
        this.webhook = webhook instanceof Webhook ? webhook : null;
    }

    /**
     * Set the connection's webhook data
     * @param webhook the webhook
     */
    setWebhookData(webhook: Webhook<WebhookType.Incoming> | null) {
        this.webhookId = webhook?.id || null;
        this.webhook = webhook instanceof Webhook ? webhook : null;
    }

    /**
     * Set the connection's manager
     * @param userId 
     */
    setManager(userId: string) {
        this.managedBy = userId;
    }

    /**
     * Whether this connection can be managed by a user
     * @param userId 
     * @returns 
     */
    isManageable(userId: string) {
        return this.managedBy === userId || userId === config.ownerId;
    }

    /**
     * Get the relative timestamp for this connection's creation date
     * @returns 
     */
    getCreationDate() {
        return new Date(this.createdTimestamp).toUTCString();
    }
}