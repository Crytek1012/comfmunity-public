import { Attachment, PermissionFlagsBits, Colors as DiscordColors } from "discord.js";

export const BasePermissions = [
    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks
]

export const PermissionsBitsFlags: Record<string, string> = Object.fromEntries(Object.entries(PermissionFlagsBits).map(([key, value]) => [value as bigint, key.replace(/([A-Z])/g, ' $1').trim()]));

export const regexes = {
    duration: /\b(\d+\s?(mo(?:nths?)?|d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?|s(?:econds?)?))(\s*(?:and\s*)?(\d+\s?(mo(?:nths?)?|d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?|s(?:econds?)?)))*\b/,
    snowflake: /^\d{17,19}$/,
    id: /\d{17,19}/,
    media: /\.(png|jpe?g|gif|webm|mp4)$/i
}

export const MAX_HELP_MENU_ITEMS = 10;
export const isSnowflake = (id: string) => regexes.snowflake.test(id);
export const extractIDs = (string: string) => string.match(regexes.id);
export const capitalizeString = (string: string) => string[0].toUpperCase() + string.slice(1);
export const replaceReadableToTimestring = (string: string) => string.replaceAll('and', '');

/**
 * Whether the attachment is media
 * @param attachment the attachment
 * @returns 
 */
export const isMediaAttachment = (attachment: Attachment) => {
    const type = attachment.contentType?.split(';')[0].trim();

    return type?.startsWith('image/') || type?.startsWith('video/') || regexes.media.test(attachment.url);
}

export const Colors = {
    ...DiscordColors,
    EmiliaPurple: 10944709
}

export const Emotes = {
    Comf: '<:NoelleComf:934980916990836776>',
    Cool: '<:NoelleCoolelle:829763499462623312>',
    Protecc: '<:NoelleProtecc:815356906369318923>',
    Technoellogist: '<:NoelleTechnoellogist:979442828050579506>',
    Wat: '<:NoelleWat:809976665358336000>'
}