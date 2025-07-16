import client from "../core/client.js";
import database from "../core/database.js"
import { ErrorHandler } from "../structures/error-handler.js";
import { GlobalNetworkEvents } from "../structures/event.js";

export const userUnbanInterval = async () => {
    const usersBanned = await database.bans.fetchAll({
        expiresAt: { $lt: Date.now() }
    });

    for (const ban of usersBanned) {
        try {
            await database.bans.delete(ban.userId);

            const user = await client.users.fetch(ban.userId).catch(err => null);
            const authority = await database.authorities.fetch(ban.authorityId).catch(err => null);
            client.emit(GlobalNetworkEvents.UserUnban, user, authority, ban)
        }
        catch (err) {
            ErrorHandler.handle(err, { context: 'Unban Interval' });
        }
    }
}