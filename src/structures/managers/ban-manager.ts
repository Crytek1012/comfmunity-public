import { Filter } from "mongodb";
import { BanSchema } from "../../schemas/ban.js";
import { IRawUserBan } from "../../types/database.js";
import { CollectionManager, defaultFetchOptions } from "./collection-manager.js";

export default class BanManager extends CollectionManager<IRawUserBan> {

    /**
     * Fetch a ban
     * @param userId 
     * @param options 
     * @returns 
     */
    async fetch(userId: string, options = defaultFetchOptions) {
        const opt = { ...defaultFetchOptions, ...options };

        const cached = this.cache.get(userId);
        if (cached && opt.checkCache) return cached;

        const rawData = await this.collection.findOne({ userId });
        if (!rawData) return null;

        if (opt.cache) this.cache.set(userId, rawData);
        return rawData;
    }

    /**
     * Fetch all the bans
     * @param query the filter to apply
     * @param options 
     * @returns 
     */
    async fetchAll(query: Filter<IRawUserBan> = {}, options = defaultFetchOptions) {
        const opt = { ...defaultFetchOptions, ...options };

        const rawData = await this.collection.find(query).toArray();
        if (opt.cache) rawData.forEach(data => this.cache.set(data.userId, data));

        return rawData;
    }

    /**
     * Create new ban data
     * @param data 
     */
    async create(data: IRawUserBan) {
        const parsed = BanSchema.safeParse(data);
        if (!parsed.success) {
            throw new Error(`Validation failed: ${parsed.error.message}`);
        }

        await this.collection.insertOne(parsed.data);
        this.cache.set(data.userId, data);
    }

    /**
     * Delete ban data
     * @param userId 
     * @returns 
     */
    async delete(userId: string) {
        if (!this.cache.has(userId)) return;

        await this.collection.deleteOne({ userId });
        this.cache.delete(userId);
    }
}
