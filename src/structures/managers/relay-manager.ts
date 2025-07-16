import { RelaySchema } from "../../schemas/relay.js";
import { IRawRelayData, IRawRelayPayloadData } from "../../types/database.js";
import { RelayMessage, RelayMessageData } from "../relay.js";
import { CollectionManager } from "./collection-manager.js";

export default class RelayManager extends CollectionManager<IRawRelayData, RelayMessage> {

    /**
     * Fetch a relay message
     * @param id 
     * @returns 
     */
    async fetch(id: string) {
        const cached = this.cache.get(id);
        if (cached) return cached;

        const rawData = await this.collection.findOne({
            $or: [
                { id },
                { 'references.messageId': id }
            ]
        });
        if (!rawData) return null;

        const relayMessage = new RelayMessage(rawData);
        this.cache.set(relayMessage.id, relayMessage);
        return relayMessage;
    }

    /**
    * Fetch a relay by its origin ID
    * @param id the ID of the relay
    */
    async fetchByOrigin(id: string) {
        const cached = this.cache.get(id);
        if (cached) return cached;

        const rawData = await this.collection.findOne({ id });
        if (!rawData) return null;

        const relayMessage = new RelayMessage(rawData);
        this.cache.set(relayMessage.id, relayMessage);

        return relayMessage;
    }

    /**
     * Create a new relay
     * @param data the data of the relay
     */
    async create(data: RelayMessageData) {
        const parsed = RelaySchema.safeParse(data);
        if (!parsed.success) {
            throw new Error(`Validation failed: ${parsed.error.message}`);
        }

        await this.collection.insertOne(data);
        this.cache.set(data.id, new RelayMessage(data));
    }

    // /**
    //  * Update a relay's payload
    //  * @param id 
    //  * @param data 
    //  *
    async updatePayload(id: string, newPayload: IRawRelayPayloadData) {

        const update: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(newPayload)) {
            if (value !== undefined) update[`payload.${key}`] = value;
        }

        await this.collection.updateOne({ id }, {
            $set: update
        });

        this.cache.get(id)?.updatePayload(newPayload);
    }

    /**
     * Delete a relay
     * @param id the ID of the relay
     * @returns 
     */
    async delete(id: string) {
        if (!this.cache.has(id)) return;

        await this.collection.deleteOne({
            $or: [
                { id },
                { 'messages.messageId': id }
            ]
        });

        this.cache.delete(id);
    }
}