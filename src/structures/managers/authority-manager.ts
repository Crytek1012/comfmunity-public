import { AuthoritySchema } from "../../schemas/authority.js";
import { IRawAuthorityData } from "../../types/database.js";
import { Authority, AuthorityData, AuthorityLevel } from "../authority.js";
import { CollectionManager } from "./collection-manager.js";

export default class AuthorityManager extends CollectionManager<IRawAuthorityData, Authority> {

    /**
     * Fetch an authority
     * @param userId the ID of the authority
     * @returns 
     */
    async fetch(userId: string) {
        const cached = this.cache.get(userId);
        if (cached) return cached;

        const rawData = await this.collection.findOne({ userId });
        if (!rawData) return null;

        const authority = new Authority(rawData);
        this.cache.set(authority.userId, authority);
        return authority;
    }

    /**
     * Create a new authority
     * @param data the authority data
     */
    async create(data: AuthorityData) {
        const parsed = AuthoritySchema.safeParse(data);
        if (!parsed.success) {
            throw new Error(`Validation failed: ${parsed.error.message}`);
        }

        await this.collection.insertOne(data);
        this.cache.set(data.userId, new Authority(data));
    }

    /**
     * Delete an authority
     * @param userId the ID of the authority
     */
    async delete(userId: string) {
        if (!this.cache.has(userId)) return;

        await this.collection.deleteOne({ userId });
        this.cache.delete(userId);
    }

    /**
     * Update this authority's level
     * @param userId the ID of the authority
     * @param level the new level
     */
    async updateLevel(userId: string, level: AuthorityLevel) {
        const cached = this.getCached(userId);

        await this.collection.updateOne({ userId }, {
            $set: {
                level: level
            }
        });

        cached.setLevel(level);
    };

    /**
     * Update the hidden value of this authority
     * @param userId the ID of the authority
     * @param hidden boolean
     */
    async updateHiddenStatus(userId: string, hidden: boolean) {
        const cached = this.getCached(userId);

        await this.collection.updateOne({ userId }, {
            $set: {
                hidden: hidden
            }
        });

        cached.setHiddenStatus(hidden);
    }
}