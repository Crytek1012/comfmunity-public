import { Collection, TextDisplayBuilder, TopLevelComponent } from "discord.js";
import { RelayMessageReferences } from "../structures/relay.js";

export interface AttachmentBuffer {
    data: { type: 'Buffer'; data: number[] };
    name: string,
    description: string,
    contentType: string,
    url: string
    spoiler: boolean
}

export interface RelayPayloadReferenceData {
    authorUsername: string;
    messages: Collection<string, RelayMessageReferences>,
    mention: { guildId: string, container: TextDisplayBuilder }
}

export interface RelayPayload {
    username: string;
    avatarUrl: string;
    files?: AttachmentBuffer[];
    components?: unknown[],
    mentions?: string[];
    reference?: RelayPayloadReferenceData
}

export type RelayMessageResolvables = Collection<string, { channelId: string, messageId: string }>

export interface RelayPATCHPayload {
    messages: Collection<string, { channelId: string, messageId: string }>;
}

export interface RelayDELETEData {
    messages: Collection<string, { channelId: string, messageId: string }>;
}