export const config = {
    prefix: '!',
    ownerId: '',
    mainConnectionId: '',
    alertChannelId: '',
    messageLogsChannelId: '',
    modLogsChannelId: '',
    loadWebhooksOnStartup: true,
    logToFile: true,
    logPath: './app.log'
} as const;


function getEnvVar(key: string): string {
    const secret = process.env[key];
    if (!secret) throw new Error('Unknown Environment variable ' + key);

    return secret;
}

export const env = {
    CLIENT_TOKEN: getEnvVar('CLIENT_TOKEN'),
    MONGO_URI: getEnvVar('MONGO_URI'),
    MONGO_DB: getEnvVar('MONGO_DB'),
};