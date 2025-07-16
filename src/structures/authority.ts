import { User } from "discord.js";
import client from "../core/client.js";

export enum AuthorityLevel {
    Moderator = 1,
    Admin,
    Owner
}

export const AssignableAuthorityLevels = ['moderator', 'admin'];

export const AuthorityLevelMap = Object.fromEntries(
    Object.entries(AuthorityLevel)
        .filter(([key, value]) => typeof value === "number")
        .map(([key, value]) => [key.toLowerCase(), value])
) as Record<string, AuthorityLevel>;

export interface AuthorityData {
    userId: string;
    username: string;
    user?: User;
    level: number;
    hidden: boolean;
    createdTimestamp: number;
}

export class Authority {
    readonly userId: string;
    username: string;
    user: User | null;
    level: AuthorityLevel;
    hidden: boolean;
    readonly createdTimestamp: number;

    constructor({ userId, username, user, level, hidden, createdTimestamp }: AuthorityData) {
        this.userId = userId;
        this.username = username;
        this.level = level;
        this.hidden = hidden;
        this.createdTimestamp = createdTimestamp;
        this.user = user || client.users.cache.get(this.userId) || null;
    }

    /**
     * Fetch the user of this authority
     * @returns 
     */
    async fetchUser() {
        if (!this.user) this.user = await client.users.fetch(this.userId);
        return this.user;
    }

    /**
     * Set the level of this authority
     * @param level the level
     */
    setLevel(level: AuthorityLevel) {
        this.level = level;
    }

    /**
    * Whether the authority should display in the user's name
    * @returns 
    */
    isHidden() {
        return this.hidden;
    }

    /**
     * Set the hidden value of this authority
     * @param hidden boolean
     */
    setHiddenStatus(hidden: boolean) {
        this.hidden = hidden;
    }
}