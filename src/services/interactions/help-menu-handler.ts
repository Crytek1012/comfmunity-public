import { EmbedBuilder, MessageFlags, StringSelectMenuInteraction } from "discord.js";
import database from "../../core/database.js";
import client from "../../core/client.js";
import { capitalizeString, Colors, MAX_HELP_MENU_ITEMS } from "../../utils/util.js";
import { createNavigationRow, getCategoriesMenu } from "../../utils/buttons.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import { config } from "../../config.js";

export async function helpSelectMenuHandler(interaction: StringSelectMenuInteraction) {
    await interaction.deferUpdate({ withResponse: true });

    const executorAuthority = await database.authorities.fetch(interaction.user.id);
    const targetCategory = interaction.values[0];

    const targetCategoryCommands = targetCategory !== 'menu' ? client.commands.getCategoryCommands(targetCategory, (c => c.requiredAuthority <= (executorAuthority?.level || 0))) : null;
    if ((targetCategory !== 'menu') && (!targetCategoryCommands || targetCategoryCommands.length === 0)) {
        return interaction.followUp({ content: 'I could not find that category, or you don\'t have access to its commands.', flags: MessageFlags.Ephemeral });
    }

    const embedTitle = targetCategoryCommands?.length ? `${capitalizeString(targetCategory)} commands` : 'Commands List';
    const embedDescription = targetCategoryCommands?.length ?
        targetCategoryCommands.slice(0, MAX_HELP_MENU_ITEMS).map(c => `**${c.capitalizeName()}**\n- ${c.description}\n  - ${c.formatUsage()}`).join('\n')
        : `\`${config.prefix}help [category]\``

    const embed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setColor(Colors.EmiliaPurple)
        .setDescription(embedDescription)

    // if no target category, add category fields
    const allowedCategories = client.commands.getCategories(executorAuthority?.level)
    if (!targetCategoryCommands) {
        allowedCategories.forEach((c, category) => embed.addFields({ name: capitalizeString(category), value: `${c.size} commands`, inline: true }));
    }

    const components: any[] = [getCategoriesMenu(allowedCategories, targetCategory)];
    if (targetCategoryCommands && targetCategoryCommands.length > MAX_HELP_MENU_ITEMS) components.unshift(createNavigationRow('help', `${0}_${targetCategory}`));

    try {
        return interaction.message.edit({ embeds: [embed], components })
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'interaction create - help command' })
    }
}