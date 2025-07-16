import { Document } from "mongodb";

export interface IRawConnectionData extends Document {
    guildId: string;
    guildName: string;
    channelId: string | null;
    webhookId: string | null;
    managedBy: string;
    enabled: boolean;
    createdTimestamp: number;
}

export interface IRawAuthorityData extends Document {
    userId: string;
    username: string;
    level: number;
    hidden: boolean;
    createdTimestamp: number;
}

export interface IRawRelayData extends Document {
    id: string;
    guildId: string;
    channelId: string;
    authorId: string;
    references: {
        channelId: string;
        messageId: string;
    }[];
    payload: IRawRelayPayloadData;
}

export interface IRawRelayPayloadData {
    username: string;
    avatarUrl: string;
    content?: string;
    attachments?: string[];
    files?: string[];
    mention?: {
        guildId: string;
        userId: string;
    }
}

export interface IRawUserBan {
    userId: string;
    username: string;
    authorityId: string;
    expiresAt: number | null;
    createdTimestamp: number;
    reason: string | null;
}