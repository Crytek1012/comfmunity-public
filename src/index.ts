import client from "./core/client.js";
import { Filter } from "node-profanity-filter";
import { ErrorHandler } from "./structures/error-handler.js";
import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs/promises';
import { Logger } from "./structures/logger.js";
const blockedWords = JSON.parse(await fs.readFile(new URL('./data/blocked-words.json', import.meta.url), 'utf8'));

client.connect();
export const filter = new Filter({
    wordBoundaries: true,
    parseObfuscated: true,
    disableDefaultList: true,
    includeWords: blockedWords.default
});

process.on('uncaughtException', err => {
    console.log(err);
    ErrorHandler.handle(err, { context: 'Uncaught Exception', emitAlert: true });
})

process.on('SIGINT', async () => {
    await Logger.stopLogger();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await Logger.stopLogger();
    process.exit(0);
});