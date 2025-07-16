import { Client, ClientEvents, Collection, Events, GatewayIntentBits, Partials, TextChannel } from "discord.js";
import { readdir } from "fs/promises";
import database from "./database.js";
import { Command } from "../structures/command.js";
import path from 'path';
import { pathToFileURL } from 'url';
import { config } from "../config.js";
import { Logger } from "../structures/logger.js";
import { ErrorHandler } from "../structures/error-handler.js";
import { IComfmunityEvents } from "../structures/event.js";
import { validateRuntimeConfig } from "../utils/validate-config.js";
import { CommandManager } from "../structures/command-manager.js";
import { userUnbanInterval } from "../services/intervals.js";

type NetworkEvents = ClientEvents & IComfmunityEvents;

class ConnectionClient extends Client {
    commands = new CommandManager();

    // accept comfmunity events
    override emit<K extends keyof NetworkEvents>(
        event: K,
        ...args: NetworkEvents[K]
    ): boolean {
        return super.emit(event as any, ...args);
    }

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],
            partials: [
                Partials.Message
            ],
            allowedMentions: { parse: [], repliedUser: true },
            // sweepers: {
            //     messages: { interval: 3600000, lifetime: 3600000 }
            // }
        });

        this.on(Events.ClientReady, async () => {
            Logger.log('Connected to Discord.');

            try {
                await validateRuntimeConfig(this);
            } catch (err) {
                return await ErrorHandler.handle(err, { context: 'config', killProcess: true });
            }

            await database.connect();
            Logger.log('Connected to the database.');

            if (config.loadWebhooksOnStartup) {
                const count = await this.loadWebhooks();
                Logger.log(`Loaded ${count} webhooks for ${database.connections.cache.size} connections.`);
            }

            // interval for unbanning users
            setInterval(async () => {
                try {
                    await userUnbanInterval();
                } catch (e) {
                    ErrorHandler.handle(e, { context: 'Unban interval' });
                }
            }, 60000);

            await this.registerCommands(path.resolve(process.cwd(), 'dist', 'commands'));
            Logger.log('Loaded commands.');

            await this.registerEvents(path.resolve(process.cwd(), 'dist', 'events'));
            Logger.log('Loaded events.');

            Logger.log('Ready!');
        })
    }

    /**
     * Connect the client to Discord
     */
    async connect() {
        await this.login(process.env.CLIENT_TOKEN);
    };

    /**
     * Fetch the channel for message logs
     * @returns 
     */
    async fetchMessageLogsChannel() {
        if (!config.messageLogsChannelId) throw new Error('No message logs channel configured.');

        const channel = await this.channels.fetch(config.messageLogsChannelId);
        if (!channel) throw new Error('Failed to retrieve message logs channel.')

        return channel as TextChannel
    }

    /**
     * Fetch the channel for moderation logs
     * @returns 
     */
    async fetchModLogsChannel() {
        if (!config.modLogsChannelId) throw new Error('No mod logs channel configured.');
        const channel = await this.channels.fetch(config.modLogsChannelId);
        if (!channel) throw new Error('Failed to retrieve mod logs channel.')

        return channel as TextChannel
    }

    /**
     * Load all the webhooks
     */
    async loadWebhooks() {
        const connections = await database.connections.fetchAll();

        const result = await Promise.all(connections.map(async connection => {
            try {
                await connection.fetchWebhook();
                return true;
            }
            catch (err) {
                ErrorHandler.handle(err, { context: 'client', connection })
            }
        }));

        return result.filter(r => r === true).length;
    }

    /**
     * Create a webhook for a channel
     * @param channel the channel
     */
    async createChannelWebhook(channel: TextChannel) {
        if (!this.isReady()) throw new Error('Client is not ready.');

        const webhook = await channel.createWebhook({
            name: this.user.username,
            avatar: this.user.avatarURL()
        });

        return webhook;
    };

    /**
    * Helper function to import a module
    * @param filePath the path to the file
    * @returns 
    */
    private async importFile(filePath: string) {
        try {
            const module = await import(pathToFileURL(filePath).href);
            return module.default?.default || module.default || null;
        } catch (err) {
            ErrorHandler.handle(err, { context: 'client importFile', emitAlert: true });
        }
    }

    /**
     * Register text commands
     * @param dirPath the path to the directory
     */
    private async registerCommands(dirPath: string): Promise<void> {

        const commandDir = await readdir(dirPath, { withFileTypes: true });

        for (const file of commandDir) {
            const fullPath = path.join(dirPath, file.name);

            if (file.isDirectory()) {
                await this.registerCommands(fullPath)
            }
            else {
                const command = await this.importFile(fullPath);
                if (!command) continue;

                (command as Command).setCategory(file.parentPath.split(/[/\\]/).pop()!)
                this.commands.addCommand(command);
            }
        }
    }

    /**
     * Register events
     * @param dirPath the path to the directory
     */
    private async registerEvents(dirPath: string): Promise<void> {
        const eventsDir = await readdir(dirPath, { withFileTypes: true });

        for (const file of eventsDir) {
            const fullPath = path.join(dirPath, file.name);

            if (file.isDirectory()) {
                await this.registerEvents(fullPath)
            }
            else {
                const event = await this.importFile(fullPath);
                if (!event) continue;

                this.on(event.event, event.run);
            }
        }
    }
};

const client = new ConnectionClient();
export default client;