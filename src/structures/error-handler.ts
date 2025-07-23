import { Colors, DiscordAPIError, DiscordjsError, EmbedBuilder, RESTJSONErrorCodes, TextChannel } from "discord.js";
import { Logger } from "./logger.js";
import { Connection } from "./connection.js";
import database from "../core/database.js";
import client from "../core/client.js";
import { config } from "../config.js";

interface HandlerOptions {
    context?: string;
    emitAlert?: boolean;
    connection?: Connection;
    killProcess?: boolean;
}

export class ErrorHandler {
    static async handle(err: DiscordAPIError | DiscordjsError | Error | unknown, data: HandlerOptions = {}) {
        if (!(err instanceof Error)) {
            return Logger.warn(
                data.context || 'Uncaught',
                'Non-Error thrown: ' + (typeof err === 'object' ? JSON.stringify(err) : String(err))
            );
        }

        Logger.error(data.context || 'Uncaught', err.message, err);

        try {
            if (err instanceof DiscordAPIError || err instanceof DiscordjsError) await this.handleDiscordError(err, data);
        }
        catch (innerErr: unknown) {
            if (innerErr instanceof Error) Logger.error(this.name, innerErr.message, innerErr);
            else Logger.log(this.name + innerErr);
        }

        if (data.emitAlert) await this.emitAlert(err);
        if (data.killProcess) {
            await Logger.stopLogger();
            process.exit();
        }
    }

    private static async handleDiscordError(err: DiscordAPIError | DiscordjsError, data: HandlerOptions) {
        if (err.code === RESTJSONErrorCodes.UnknownWebhook) {
            if (!data.connection) return;
            await database.connections.updateWebhookData(data.connection.guildId, null);
        }
        // remove channel data
        if (err.code === RESTJSONErrorCodes.UnknownChannel) {
            if (!data.connection || !data.connection.channelId) return;
            await database.connections.updateChannelData(data.connection.channelId, null, null);
        }

        if (err.code === RESTJSONErrorCodes.UnknownGuild) {
            if (!data.connection) return;
            await database.connections.delete(data.connection.guildId);
        }
    }

    private static async emitAlert(err: Error) {
        if (!config.alertChannelId) return Logger.warn('Alert failed', 'Alert channel has not been configured.');

        const alertChannel = client.channels.cache.get(config.alertChannelId);
        if (!alertChannel?.isTextBased()) {
            return Logger.warn('Alert failed', 'Alert channel missing or not text-based.');
        }

        const embed = new EmbedBuilder()
            .setTitle('Alert')
            .setColor(Colors.DarkRed)
            .setDescription(`[${err.name}] - ${err.message}`);

        (alertChannel as TextChannel).send({ embeds: [embed] }).catch(err => Logger.error('Alert failed', err.message, err));
    }
}