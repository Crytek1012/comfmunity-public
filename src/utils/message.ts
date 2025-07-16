import { ActionRowBuilder, APIEmbed, Attachment, ButtonBuilder, ButtonStyle, Collection, Colors, ComponentType, ContainerBuilder, Embed, EmbedType, MediaGalleryBuilder, Message, TextDisplayBuilder } from "discord.js";
import { extractIDs, isMediaAttachment } from "./util.js";
import database from "../core/database.js";
import { AttachmentBuffer, RelayPayload, RelayPayloadReferenceData } from "../types/relay-handler.js";
import { AuthorityLevel } from "../structures/authority.js";
import client from "../core/client.js";
import { ErrorHandler } from "../structures/error-handler.js";
import { IRawRelayPayloadData } from "../types/database.js";

/**
 * Whether the message provided can be relayed
 * @param message the message
 * @returns 
 */
export function validateMessage(message: Message<true>) {
    const { content, attachments, embeds, stickers, components } = message;

    if (!content && attachments.size === 0 && embeds.length === 0 && stickers.size === 0 && components.length === 0) return false;
    return true
}

/**
 * Extract the content from a message
 * @param message the message
 * @returns 
 */
export async function parseMessageContent(message: Message<true>) {
    if (!validateMessage(message)) throw new Error('The message provided could not be validated.');

    const { content, attachments, embeds, stickers, components } = message;
    const [media, files] = attachments.partition(a => isMediaAttachment(a));

    const contentContainer = content ? new TextDisplayBuilder({ content }) : null;
    const mediaContainer = media.size > 0 ? new MediaGalleryBuilder({
        items: media.map(a =>
        ({
            description: a.description,
            spoiler: a.spoiler,
            media: { url: a.url }
        }))
    }) : null;

    const embedsContainers = embeds.length > 0 ? convertEmbedsToContainers(embeds) : null;

    // No support for sticker conversion.
    const sticker = stickers.first();
    const stickerContainer = sticker ?
        new ContainerBuilder()
            .addTextDisplayComponents({ type: ComponentType.TextDisplay, content: `### ${sticker.name}` })
            .addMediaGalleryComponents(new MediaGalleryBuilder({ items: [{ media: { url: sticker.url } }] }))
        : null;

    const messageComponents: unknown[] = [];
    if (contentContainer) messageComponents.push(contentContainer);
    if (mediaContainer) messageComponents.push(mediaContainer);
    if (embedsContainers) messageComponents.push(...embedsContainers);
    if (stickerContainer) messageComponents.push(stickerContainer);

    messageComponents.push(...components);

    const bufferedFiles = await resolveAttachments(files)

    return {
        files: bufferedFiles,
        components: messageComponents
    }
};

/**
 * Build a relay from a message
 * @param message the message
 * @returns 
 */
export const buildRelayFromMessage = async (message: Message<true>): Promise<RelayPayload> => {
    const payload = await parseMessageContent(message);

    const authority = await database.authorities.fetch(message.author.id);
    const authorityString = authority ? `${AuthorityLevel[authority.level]} - ` : '';
    const username = (message.member?.displayName || message.author.displayName) + ' - ' + authorityString + message.guild.name;
    const avatarUrl = message.member?.displayAvatarURL() || message.author.displayAvatarURL();

    const referenceId = message.reference?.messageId;
    const referenceRelay = referenceId ? await database.relays.fetch(referenceId) : null;
    const mentions = referenceRelay ? [referenceRelay.authorId] : [];

    const author = await referenceRelay?.fetchAuthor().catch(() => null);

    const reference: RelayPayloadReferenceData | null = referenceRelay ? {
        authorUsername: author?.displayName || 'Unknown User',
        messages: referenceRelay.getAllReferences(),
        mention: {
            guildId: referenceRelay.guildId,
            container: new TextDisplayBuilder({ content: `<@${referenceRelay.authorId}>` })
        }
    } : null;

    return {
        username,
        avatarUrl,
        mentions,
        ...(reference && { reference }),
        ...payload
    }
};

/**
 * Get the payload of a message
 * @param message 
 * @returns 
 */
export const getMessagePayload = async (message: Message<true>): Promise<IRawRelayPayloadData> => {
    const username = message.author.username;
    const avatarUrl = message.author.displayAvatarURL();
    const [media, files] = message.attachments.partition(a => isMediaAttachment(a));

    const payload: IRawRelayPayloadData = {
        username,
        avatarUrl
    }

    if (message.content) payload.content = message.content;

    if (media.size > 0) payload.attachments = media.map(a => a.url);
    if (files.size > 0) payload.files = files.map(a => a.url);

    const referenceId = message.reference?.messageId;
    const referenceRelay = referenceId ? await database.relays.fetch(referenceId) : null;
    if (referenceRelay) payload.mention = {
        guildId: referenceRelay.guildId,
        userId: referenceRelay.authorId
    }

    return payload;
}

/**
 * Helper function to retrieve the URL button of a connection
 * @param references the message references
 * @param channelId the target channel ID
 * @param guildId the target guild ID
 * @param username the displayed username
 * @returns 
 */
export const getReferenceButton = (references: RelayPayloadReferenceData, channelId: string, guildId: string, username: string) => {
    const channelData = references.messages?.get(channelId);
    if (!channelData) return null;

    const url = `https://discord.com/channels/${guildId}/${channelId}/${channelData.messageId}`;
    return createReferenceButton(username, url);
}

/**
 * Create a URL button
 * @param username 
 * @param url 
 * @returns 
 */
export const createReferenceButton = (username: string, url: string) => {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setEmoji('<:reply:1157587403024892025>')
                .setLabel(username)
                .setURL(url)
        )
}

/**
 * Convert embeds to V2 components
 * @param embeds
 * @returns 
 */
export const convertEmbedsToContainers = (embeds: APIEmbed[] | Embed[]) => {
    return embeds.map(embed => {
        const container = new ContainerBuilder();
        container.setAccentColor(embed.color ?? Colors.Default);

        const type = embed instanceof Embed ? embed.data.type : embed.type;
        if (type === EmbedType.GIFV || type === EmbedType.Image) return null;

        if (embed.title)
            container.addTextDisplayComponents({ type: ComponentType.TextDisplay, content: `### ${embed.title}` });

        if (embed.author?.name)
            container.addTextDisplayComponents({ type: ComponentType.TextDisplay, content: `### ${embed.author.name}` });

        if (embed.description?.length)
            container.addTextDisplayComponents({ type: ComponentType.TextDisplay, content: embed.description });

        if (embed.fields?.length) {
            embed.fields.forEach(field => {
                const content = `**${field.name}**\n${field.value}`;
                container.addTextDisplayComponents({ type: ComponentType.TextDisplay, content });
            });
        }

        if (embed.image?.url)
            container.addMediaGalleryComponents({
                type: ComponentType.MediaGallery,
                items: [{ media: { url: embed.image.url } }],
            });

        if (embed.thumbnail?.url)
            container.addMediaGalleryComponents({
                type: ComponentType.MediaGallery,
                items: [{ media: { url: embed.thumbnail.url } }],
            });

        if (embed.footer?.text)
            container.addTextDisplayComponents({ type: ComponentType.TextDisplay, content: embed.footer.text });

        if (embed.timestamp)
            container.addTextDisplayComponents({
                type: ComponentType.TextDisplay,
                content: new Date(embed.timestamp).toLocaleString(),
            });

        return container;
    }).filter((c): c is ContainerBuilder => !!c && c.components.length > 0);
};

/**
 * Retrieve the buffers of the provided attachments
 * @param attachments 
 * @returns 
 */
export const resolveAttachments = async (attachments: Attachment[] | Collection<string, Attachment>): Promise<AttachmentBuffer[]> => {
    // really dirty typing fix to accept Collection as mappable
    const promises = (attachments as Attachment[]).map(async attachment => {
        try {
            const response = await fetch(attachment.url);
            if (!response.ok) return null;

            return {
                data: Buffer.from(await response.arrayBuffer()).toJSON(),
                name: attachment.name,
                description: attachment.description,
                contentType: attachment.contentType,
                url: attachment.url,
                spoiler: attachment.spoiler
            };
        } catch (err) {
            ErrorHandler.handle(err as Error, { context: 'resolveAttachments', emitAlert: true });
            return null;
        }
    })

    return (await Promise.all(promises)).filter(Boolean) as AttachmentBuffer[];
}

/**
 *  Retrieve the buffers of the provided urls
 * @param urls 
 */
export const resolveUrlBuffers = async (urls: string[]) => {
    const promises = urls.map(async url => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            return {
                data: Buffer.from(await response.arrayBuffer()).toJSON(),
                name: 'unknown',
                description: '',
                contentType: '',
                url: url,
                spoiler: false
            }

        } catch (err) {
            ErrorHandler.handle(err as Error, { context: 'resolveUrlBuffers', emitAlert: true });
            return null;
        }
    });

    return (await Promise.all(promises)).filter(Boolean) as AttachmentBuffer[];
}


/**
 * Extract the first mention from a message
 * @param message
 * @param options 
 * @returns 
 */
export const getFirstMention = async (message: any, options: { referenceId?: string; ignoreReference?: boolean }) => {
    if (!options.ignoreReference && options.referenceId) {
        const relayMessage = await database.relays.fetch(options.referenceId).catch((err: Error) => null);
        if (!relayMessage) return null;

        return await client.users.fetch(relayMessage.authorId);
    }

    const userIDs = extractIDs(message.content);
    if (userIDs) {
        return await client.users.fetch(userIDs[0]);
    }

    if (message.mentions.users.size > 0) {
        return message.mentions.users.first()!;
    }

    if (!options.ignoreReference && message.mentions.repliedUser) {
        return message.mentions.repliedUser;
    }

    return null;
}