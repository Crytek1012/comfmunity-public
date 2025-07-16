import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, MessageActionRowComponentBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js"
import client from "../core/client.js"
import { capitalizeString, Emotes } from "./util.js";
import { EmoteToCategoryMap } from "../structures/command-manager.js";

export const getCategoriesMenu = (targetCategories?: Collection<string, Set<string>>, defaultOption?: string) => {
    const categories = targetCategories || client.commands.getCategories();

    const menuItems = categories.map((c, category) => {
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(capitalizeString(category))
            .setValue(category)
            .setDefault(category === defaultOption)
        if (EmoteToCategoryMap[category]) option.setEmoji(EmoteToCategoryMap[category])

        return option;
    }
    )

    const defaultItems = new StringSelectMenuOptionBuilder()
        .setLabel('Menu')
        .setValue('menu')
        .setEmoji(Emotes.Comf)

    menuItems.unshift(defaultItems);

    const menu = new StringSelectMenuBuilder()
        .setCustomId('help')
        .setPlaceholder('Make a comfy selection')
        .addOptions(menuItems)

    return new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(menu)
}

const backArrow = '◀';
const forwardArrow = '▶';
const stopArrow = '⏹';

export const createInteractionId = (name: string, action: string, extra: string | number = '') => {
    return `${name}_${action}_${extra}`;
}

const createNavigationButtons = (command: string, extra = '') => ({
    back: new ButtonBuilder().setCustomId(createInteractionId(command, 'back', extra)).setLabel('Back').setEmoji(backArrow).setStyle(ButtonStyle.Primary),
    next: new ButtonBuilder().setCustomId(createInteractionId(command, 'next', extra)).setLabel('Next').setEmoji(forwardArrow).setStyle(ButtonStyle.Primary),
    home: new ButtonBuilder().setCustomId(createInteractionId(command, 'home', extra)).setLabel('Home').setEmoji(stopArrow).setStyle(ButtonStyle.Primary),
});

export const createNavigationRow = (command: string, extra = '') => {
    const buttons = createNavigationButtons(command, extra);
    return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons.back, buttons.home, buttons.next);
}