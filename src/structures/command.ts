import { GuildMember, Message } from "discord.js";
import { PermissionsBitsFlags } from "../utils/util.js";
import { Connection } from "./connection.js";
import { config } from "../config.js";

export interface BaseCommandData {
    name: string;
    aliases?: string[];
    description: string;
    usage: string;
    requiredArgs?: number;
    requiredPermissions?: bigint[];
    requiredAuthority?: number;
    position?: number;
}

export interface ConnectionCommand extends BaseCommandData {
    requireConnection: true;
    execute: (this: Command, message: Message<true>, args: string[], connection: Connection) => void;
}

export interface GlobalCommand extends BaseCommandData {
    requireConnection?: false;
    execute: (this: Command, message: Message<true>, args: string[], connection: null) => void;
}

export type CommandData = ConnectionCommand | GlobalCommand;

export class Command {
    readonly name: string;
    readonly aliases: string[];
    readonly description: string;
    readonly usage: string;
    readonly requiredArgs: number;
    readonly requireConnection: boolean;
    readonly requiredPermissions: bigint[];
    readonly requiredAuthority: number;
    public position: number;
    public category: string | null = null;
    private readonly _execute: (message: Message<true>, args: string[], connection: Connection | null) => void;

    constructor({ name, aliases = [], description, usage, requiredArgs = 0, requireConnection = false, requiredPermissions = [], requiredAuthority = 0, position = 9999, execute }: CommandData) {
        this.name = name;
        this.aliases = aliases;
        this.description = description;
        this.usage = usage;
        this.requiredArgs = requiredArgs;
        this.requireConnection = requireConnection;
        this.requiredPermissions = requiredPermissions;
        this.requiredAuthority = requiredAuthority;
        this.position = position;
        this._execute = execute as (message: Message<true>, args: string[], connection: Connection | null) => void;
    }

    execute(message: Message<true>, args: string[], connection: Connection | null): void {
        if (this.requireConnection && !connection) throw new Error('Connection required.');
        return this._execute(message, args, connection);
    }

    /**
     * Get the name of the command capitalized
     * @returns 
     */
    capitalizeName() {
        return this.name[0].toUpperCase() + this.name.slice(1);
    }
    /**
     * Set the category of this command
     * @param name 
     */
    setCategory(name: string) {
        this.category = name;
    }

    /**
     * Get the command usage in a code block format
     * @returns 
     */
    formatUsage(): string {
        return `\`${this.usage}\``;
    }

    /**
     * Remove the args used to call this command
     * @param string 
     * @param offset
     * @returns 
     */
    removeCallArgs(string: string, offset = config.prefix.split(' ').length) {
        return string.split(' ').slice(offset).join(' ');
    }

    /**
     * Compare a member's permissions against the command's required permissions
     * @param member the member
     * @returns an array with the missing permissions as strings
     */
    compareMemberPermissions(member: GuildMember): string[] {
        if (this.requiredPermissions.length === 0) return [];

        return this.requiredPermissions
            .filter(perm => !member.permissions.has(perm))
            .map(perm => PermissionsBitsFlags[perm.toString()]);
    }
}