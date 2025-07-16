import { EmbedBuilder } from "discord.js";
import database from "../../core/database.js";
import { Command } from "../../structures/command.js";
import client from "../../core/client.js";
import { capitalizeString, Colors, MAX_HELP_MENU_ITEMS } from "../../utils/util.js";
import { config } from "../../config.js";
import { createNavigationRow, getCategoriesMenu } from "../../utils/buttons.js";
// import { getCommandCategoriesMenu } from "../../utils/buttons.js";

export default new Command({
    name: 'help',
    description: 'Get a list of all the commands',
    usage: '!help (category)',
    position: 2,
    async execute(message, args) {

        const executorAuthority = await database.authorities.fetch(message.author.id);
        const targetCategory = args[0];

        const targetCategoryCommands = targetCategory ? client.commands.getCategoryCommands(targetCategory, (c => c.requiredAuthority <= (executorAuthority?.level || 0))) : null;
        if (targetCategory && (!targetCategoryCommands || targetCategoryCommands.length === 0)) return message.reply({ content: 'I could not find that category, or you don\'t have access to its commands.' });

        const embedTitle = targetCategoryCommands ? `${capitalizeString(targetCategory)} commands` : 'Commands List';
        const embedDescription = targetCategoryCommands ? targetCategoryCommands.slice(0, MAX_HELP_MENU_ITEMS).map(c => `**${c.capitalizeName()}**\n- ${c.description}\n  - ${c.formatUsage()}`).join('\n') : `\`${config.prefix}help [category]\``

        const embed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setColor(Colors.EmiliaPurple)
            .setDescription(embedDescription)

        // if no target category, add category fields
        const allowedCategories = client.commands.getCategories(executorAuthority?.level)
        if (!targetCategoryCommands) {
            allowedCategories.forEach((c, category) => embed.addFields({ name: capitalizeString(category), value: `${c.size} commands`, inline: true }));
        }

        // add additional navigation row if needed
        const components: any[] = [getCategoriesMenu(allowedCategories, targetCategory)];
        if (targetCategoryCommands && targetCategoryCommands.length > MAX_HELP_MENU_ITEMS) components.unshift(createNavigationRow('help', `${0}_${targetCategory}`));

        return message.reply({ embeds: [embed], components })

    }
});