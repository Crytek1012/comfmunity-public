import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import database from "../../core/database.js";
import client from "../../core/client.js";
import { capitalizeString, Colors, MAX_HELP_MENU_ITEMS } from "../../utils/util.js";
import { ErrorHandler } from "../../structures/error-handler.js";
import { createNavigationRow, getCategoriesMenu } from "../../utils/buttons.js";

export async function helpButtonHandler(interaction: ButtonInteraction) {
    await interaction.deferUpdate({ withResponse: true });

    const [name, action, index, targetCategory] = interaction.customId.split('_');
    const executorAuthority = await database.authorities.fetch(interaction.user.id);

    const targetCategoryCommands = client.commands.getCategoryCommands(targetCategory, (c => c.requiredAuthority <= (executorAuthority?.level || 0)));
    if (!targetCategoryCommands) {
        return interaction.followUp({ content: 'I could not find that category, or you don\'t have access to its commands.', flags: MessageFlags.Ephemeral });
    }

    let newIndex = parseInt(index);
    if (action === 'next') newIndex += MAX_HELP_MENU_ITEMS;
    else if (action === 'back') newIndex -= MAX_HELP_MENU_ITEMS;
    else if (action === 'home') newIndex = 0;

    if (newIndex >= targetCategoryCommands?.length) newIndex = 0;
    if (newIndex < 0) newIndex = targetCategoryCommands.length % MAX_HELP_MENU_ITEMS ? targetCategoryCommands.length - targetCategoryCommands.length % MAX_HELP_MENU_ITEMS : targetCategoryCommands.length - MAX_HELP_MENU_ITEMS;

    const displayableCommands = targetCategoryCommands.slice(newIndex, newIndex + MAX_HELP_MENU_ITEMS).map(c => `**${c.capitalizeName()}**\n- ${c.description}\n  - ${c.formatUsage()}`).join('\n');
    const embed = new EmbedBuilder()
        .setTitle(`${capitalizeString(targetCategory)} commands`)
        .setColor(Colors.EmiliaPurple)
        .setDescription(displayableCommands)

    const allowedCategories = client.commands.getCategories(executorAuthority?.level)
    const components: any[] = [getCategoriesMenu(allowedCategories, targetCategory)];
    if (targetCategoryCommands && targetCategoryCommands.length > MAX_HELP_MENU_ITEMS) components.unshift(createNavigationRow('help', `${newIndex}_${targetCategory}`));

    try {
        return interaction.message.edit({ embeds: [embed], components })
    }
    catch (err) {
        ErrorHandler.handle(err, { context: 'interaction create - help command' })
    }


}