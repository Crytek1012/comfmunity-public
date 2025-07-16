import { Collection, TextChannel, User } from "discord.js";
import client from "../core/client.js";
import { IRawRelayPayloadData } from "../types/database.js";

export interface RelayMessageReferences {
    channelId: string;
    messageId: string;
}

export interface RelayMessageData {
    id: string;
    guildId: string;
    channelId: string;
    authorId: string;
    references: RelayMessageReferences[];
    payload: IRawRelayPayloadData;
}

export class RelayMessage {
    readonly id: string;
    readonly guildId: string;
    readonly channelId: string;
    readonly authorId: string;
    readonly references: Collection<string, RelayMessageReferences> = new Collection();
    author: User | null = null;
    payload: IRawRelayPayloadData;

    constructor({ id, guildId, channelId, authorId, references, payload }: RelayMessageData) {
        this.id = id;
        this.guildId = guildId;
        this.channelId = channelId;
        this.authorId = authorId;
        this.references = new Collection(references.map(r => [r.channelId, r]))
        this.author = client.users.cache.get(this.authorId) || null;
        this.payload = payload;
    }

    /**
     * Fetch the origin message of this relay
     * @returns 
     */
    async fetchOrigin() {
        return (await this.fetchChannel() as TextChannel).messages.fetch(this.id);
    }

    /**
    * Fetch the guild of this relay
    * @returns 
    */
    async fetchGuild() {
        return await client.guilds.fetch(this.guildId);
    }

    /**
     * Fetch the channel of this relay
     * @returns 
     */
    async fetchChannel() {
        return await client.channels.fetch(this.channelId);
    }

    /**
     * Fetch the author of this relay
     * @returns
     */
    async fetchAuthor() {
        if (!this.author) this.author = await client.users.fetch(this.authorId);
        return this.author;
    }

    /**
     * Get the URL to the origin message
     * @returns 
     */
    getOriginURL() {
        return `https://discord.com/channels/${this.guildId}/${this.channelId}/${this.id}`;
    }

    /**
     * Get the URL to a message in a guild
     * @param guildId 
     * @param channelId 
     * @returns 
     */
    getConnectionURL(guildId: string, channelId: string) {
        return `https://discord.com/channels/${guildId}/${channelId}/${channelId === this.channelId ? this.id : this.references.get(channelId)?.messageId}`;
    }

    /**
     * returns the references of this message including the origin message
     * @returns 
     */
    getAllReferences() {
        const references = this.references;
        references.set(this.channelId, { channelId: this.channelId, messageId: this.id });

        return references;
    }

    /**
     * Update the payload of this relay
     * @param newPayload 
     */
    updatePayload(newPayload: IRawRelayPayloadData) {
        this.payload = { ...this.payload, ...newPayload };
    }

}