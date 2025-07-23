import { Collection as DiscordCollection } from "discord.js";
import { Document, Collection as MongoCollection } from "mongodb";

export interface FetchOptions {
    /**
     * Whether to make a call to the db
     */
    fetch?: boolean;
    /**
     * Whether to cache the result
     */
    cache?: boolean;
    /**
     * Whether to check the cache
     */
    checkCache?: boolean;
}

export const defaultFetchOptions: FetchOptions = {
    fetch: true,
    cache: true,
    checkCache: true
}
/**
 * Wrapper for Mongo's Collection that provides built in caching
 */
export class CollectionManager<T extends Document, C = T> {
    readonly collection: MongoCollection<T>;
    cache: DiscordCollection<string, C> = new DiscordCollection();

    constructor(collection: MongoCollection<T>) {
        this.collection = collection;

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }
                if (typeof prop === 'string' && prop in target.collection) {
                    const key = prop as keyof MongoCollection<T>;
                    const value = target.collection[key];
                    return typeof value === 'function' ? value.bind(target.collection) : value;
                }
                return undefined;
            }
        });
    }

    /**
     * Get a cached item and guarantee its existence
     * @param id the id of the item
     * @returns 
     */
    getCached(id: string) {
        const cached = this.cache.get(id);
        if (!cached) throw new Error('There is no element with that ID.');
        return cached;
    }
}