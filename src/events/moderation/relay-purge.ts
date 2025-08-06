import { APIMessageTopLevelComponent, AttachmentBuilder, ComponentType, ContainerBuilder, FileBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } from "discord.js";
import { config } from "../../config.js";
import client from "../../core/client.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import { GlobalNetworkEvents } from "../../structures/event.js";
import { Event } from "../../structures/event.js";
import { Colors } from "../../utils/util.js";
import { resolveUrlBuffers } from "../../utils/message.js";

export default new Event(GlobalNetworkEvents.RelayPurge, async (relayMessage, authority) => {
    if (!config.messageLogsChannelId) return;

    const components: APIMessageTopLevelComponent[] = [];

    const infoContainer = new ContainerBuilder()
        .setAccentColor(Colors.Red)
        .addTextDisplayComponents({ type: ComponentType.TextDisplay, content: `### Message Purged` })
        .addTextDisplayComponents({ type: ComponentType.TextDisplay, content: `**User**\n<@${relayMessage.authorId}> (${relayMessage.payload.username} ${relayMessage.authorId})` })
        .addTextDisplayComponents({ type: ComponentType.TextDisplay, content: `**Authority**\n<@${authority.userId}> (${authority.user?.username || authority.username} ${authority.userId})` });

    if (relayMessage.payload.content) infoContainer.addTextDisplayComponents({ type: ComponentType.TextDisplay, content: `**Content**\n${relayMessage.payload.content}` });

    const mediaGallery = relayMessage.payload.attachments ?
        new MediaGalleryBuilder()
            .addItems(
                ...relayMessage.payload.attachments.map(url => {
                    return new MediaGalleryItemBuilder()
                        .setURL(url)
                })
            )
        : null;

    const resolvedFiles = relayMessage.payload.files ? await resolveUrlBuffers(relayMessage.payload.files) : null;
    const fileBuilder = resolvedFiles?.map((file, i) => new FileBuilder({
        file: {
            url: `attachment://${file.name}_${i}`
        },
        spoiler: file.spoiler
    }).toJSON()
    );

    components.push(infoContainer.toJSON());
    if (mediaGallery) components.push(mediaGallery.toJSON());
    if (fileBuilder) components.push(...fileBuilder);

    const queryFiles = resolvedFiles?.map(file =>
        new AttachmentBuilder(Buffer.from(file.data.data)).setName(file.name)
    ) ?? [];

    try {
        (await client.fetchMessageLogsChannel()).send({
            components,
            files: queryFiles,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        });
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'relay-purge', emitAlert: true });
    }
});