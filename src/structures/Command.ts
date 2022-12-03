import type {
	APIApplicationCommandOption,
	AutocompleteInteraction,
	Awaitable,
	CommandInteraction,
	Interaction,
	Locale,
	PermissionResolvable
} from "discord.js";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError } from "../Errors/InteractionHandlerError.js";
import { Base } from "./Base.js";

export class Command extends Base implements CommandOptions {
	public name: string;
	public nameLocalizations?: Partial<Record<Locale, string>> | undefined;

	public descriptions: Partial<Record<Locale, string>>;
	public description: string;

	public options: APIApplicationCommandOption[];
	public permissions: CommandPermissions;

	/** The category of the command (automatically set by the commandHandler) */
	public category!: string;
	/** @internal The name of the file associated with the command */
	public filename!: string;

	public constructor(client: IgloClient, options: CommandOptions) {
		super(client);
		if (!options) throw new InteractionHandlerError("noConstructorOptions");

		this.name = options.name;
		this.nameLocalizations = options.nameLocalizations;

		this.descriptions = options.descriptions ?? {};
		this.description = options.description;

		this.options = options.options ?? [];
		this.permissions = { dm: true, ...options.permissions };
	}

	/**
	 * Runs when the command is loaded
	 * @requires super callback on overwrite
	 */
	public load(options: CommandLoadOptions) {
		this.category = options.category;
		this.filename = options.filename;
	}

	/**
	 * Runs when the command is unloaded
	 */
	public unload() {
		// placeholder for possible unload function for command
	}

	public run(interaction: CommandInteraction): Awaitable<void> {
		void interaction.reply({ content: "The logic behind this command left before the party could start :(" });
	}

	public autocomplete(interaction: AutocompleteInteraction): Awaitable<void> {
		void interaction.respond([]);
	}

	public async _run(interaction: CommandInteraction): Promise<void> {
		try {
			await this.run(interaction);
		} catch (error) {
			void this.client.errorHandler.handleError(error, interaction as Interaction);
		}
	}

	public async _autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		try {
			await this.autocomplete(interaction);
		} catch (error) {
			void this.client.errorHandler.handleError(error, interaction as Interaction);
		}
	}
}

export interface CommandOptions {
	/** The name of the command */
	name: string;
	/** The name localizations of the command */
	nameLocalizations?: Partial<Record<Locale, string>>;
	/** The default description of the command. */
	description: string;
	/** A small description about the command. The English translation will also be used as default description. */
	descriptions?: Partial<Record<Locale, string>>;
	/** Options users have to pass through before sending the command
	 * @default []
	 */
	options?: APIApplicationCommandOption[];
	/** The permissions for the command */
	permissions?: Partial<CommandPermissions>;
}

export interface CommandPermissions {
	/** Whether or not the command is available in DMs
	 * @default true
	 */
	dm: boolean;
	/** The permissions needed to use this command */
	default?: PermissionResolvable;
}

export interface CommandLoadOptions {
	filename: string;
	category: string;
}
