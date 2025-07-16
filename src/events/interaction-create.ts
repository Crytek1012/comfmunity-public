import { Events } from "discord.js";
import { Event } from "../structures/event.js";
import { helpSelectMenuHandler } from "../services/interactions/help-menu-handler.js";
import { helpButtonHandler } from "../services/interactions/help-button-handler.js";

export default new Event(Events.InteractionCreate, async (interaction) => {
    if (!interaction.inGuild() || interaction.user.bot) return;

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'help') return helpSelectMenuHandler(interaction);
    }

    if (interaction.isButton()) {
        const [commandName] = interaction.customId.split('_');
        if (commandName === 'help') return helpButtonHandler(interaction)
    }

});