import { ClientEvents, User } from "discord.js";
import { Connection } from "../structures/connection.js";
import { Authority } from "../structures/authority.js";
import { RelayMessage } from "../structures/relay.js";
import { IRawUserBan } from "../types/database.js";

export enum GlobalNetworkEvents {
    // relay
    RelayUpdate = 'relayUpdate',
    RelayDelete = 'relayDelete',

    // moderation
    RelayPurge = 'relayPurge',
    UserBan = 'userBan',
    UserUnban = 'userUnban',

    // connection
    ConnectionCreate = 'connectionCreate',
    ConnectionDelete = 'connectionDelete',
    ConnectionDisable = 'connectionDisable',
    ConnectionEnable = 'connectionEnable',
    ConnectionSuspend = 'connectionSuspend',
    ConnectionUnsuspend = 'connectionUnsuspend',
    ConnectionDestroy = 'connectionDestroy',
    ConnectionUpdate = 'connectionUpdate',
    ConnectionChannelUpdate = 'connectionChannelUpdate',

    // authority
    AuthorityCreate = 'authorityCreate',
    AuthorityDelete = 'authorityDelete',
}

export interface IComfmunityEvents extends ClientEvents {
    // relays
    relayUpdate: [oldRelay: RelayMessage, newRelay: RelayMessage],
    relayDelete: [relay: RelayMessage],

    // connection
    connectionCreate: [connection: Connection, authority: Authority],
    connectionDelete: [connection: Connection, authority: Authority],
    connectionDisable: [connection: Connection, authority: Authority],
    connectionEnable: [connection: Connection, authority: Authority],
    connectionSuspend: [connection: Connection, authority: Authority],
    connectionUnsuspend: [connection: Connection, authority: Authority],
    connectionDestroy: [connection: Connection, authority: Authority],
    connectionUpdate: [oldConnection: Connection, newConnection: Connection, authority: Authority],

    // authority
    authorityCreate: [target: User, authority: Authority],
    authorityDelete: [target: User, authority: Authority],

    // moderation
    relayPurge: [relay: RelayMessage, authority: Authority],
    userBan: [target: User, authority: Authority, data: IRawUserBan],
    userUnban: [target: User | null, authority: Authority | null, data: IRawUserBan],

}

export class Event<Key extends keyof IComfmunityEvents> {
    constructor(
        public event: Key,
        public run: (...args: IComfmunityEvents[Key]) => unknown
    ) { }
}
