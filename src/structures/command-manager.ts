import { Collection } from "discord.js";
import { Command } from "./command.js";
import { AuthorityLevel } from "./authority.js";
import { Emotes } from "../utils/util.js";

/**
 * Used to filter categories displayed based on the user's authority
 */
export enum CategoryPermission {
    admin = AuthorityLevel.Admin,
    connection = AuthorityLevel.Admin,
    moderator = AuthorityLevel.Moderator,
    misc = 0
}

enum CategoryOrder {
    admin,
    moderator,
    connection,
    misc
}

export const EmoteToCategoryMap: Record<string, string> = {
    admin: Emotes.Cool,
    moderator: Emotes.Protecc,
    connection: Emotes.Technoellogist,
    misc: Emotes.Wat
};

export class CommandManager {
    private categories: Collection<string, Set<string>> = new Collection();
    private commands: Collection<string, Command> = new Collection();

    /**
     * Add a command to the manager
     * @param command 
     */
    addCommand(command: Command) {
        this.commands.set(command.name, command);

        if (command.category) {
            if (!this.categories.has(command.category)) {
                this.categories.set(command.category, new Set([command.name]));
            } else {
                this.categories.get(command.category)!.add(command.name);
            }
        }
    }

    /**
     * Retrieve a command by its name
     * @param name 
     * @returns 
     */
    getCommand(name: string) {
        return this.commands.get(name);
    }

    /**
     * Get a list of this manager's categories
     * @returns 
     */
    getCategories(minAuthority?: AuthorityLevel) {
        if (minAuthority) {
            return this.categories.filter((cmds, cat) => minAuthority >= CategoryPermission[cat as keyof typeof CategoryPermission])
                .sort((_, __, a, b) =>
                    CategoryOrder[a as keyof typeof CategoryOrder] -
                    CategoryOrder[b as keyof typeof CategoryOrder]
                );
        }

        return this.categories.sort((_, __, a, b) =>
            CategoryOrder[a as keyof typeof CategoryOrder] -
            CategoryOrder[b as keyof typeof CategoryOrder]
        );
    }

    /**
     * Get the name the categories in a format
     * @param format 
     * @returns 
     */
    getCategoriesName(format?: 'original' | 'capitalized' | 'upper' | 'lower'): string[] {
        const keys = [...this.categories.keys()];
        switch (format) {
            case 'capitalized': return keys.map(c => c[0].toUpperCase() + c.slice(1));
            case 'upper': return keys.map(c => c.toUpperCase());
            case 'lower': return keys.map(c => c.toLowerCase());
            default: return keys;
        }
    }

    /**
     * Get all the commands of a category
     * @param category the target category
     * @param filter optional filter to apply
     * @returns 
     */
    getCategoryCommands(category: string, filter?: (command: Command) => boolean): Command[] | null {
        const targetCategory = this.categories.get(category.toLowerCase());
        if (!targetCategory) return null;

        const commands = [...targetCategory.values()].map(c => this.commands.get(c)!);
        return (filter ? commands.filter(filter) : commands).sort((cmdOne, cmdTwo) => cmdOne.position - cmdTwo.position);
    }

    /**
     * Get a list of the categories and the number of commands they have
     * @returns 
     */
    getCategoriesCommandCount() {
        return this.categories.map((commands, category) => [category, commands.size])
    }

}