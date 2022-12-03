import {
	ApplicationCommand,
	ApplicationCommandAutocompleteNumericOption,
	ApplicationCommandAutocompleteStringOption,
	ApplicationCommandChannelOption,
	ApplicationCommandNumericOption,
	ApplicationCommandOption,
	ApplicationCommandOptionChoiceData,
	ApplicationCommandOptionType,
	ApplicationCommandStringOption,
	ApplicationCommandSubGroup,
	ApplicationCommandType,
	Collection,
	PermissionsBitField
} from "discord.js";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError } from "../Errors/InteractionHandlerError.js";
import type { Command } from "../structures/Command.js";
import { bold } from "colorette";
import _ from "lodash";

export class CommandRegistry {
	public constructor(public client: IgloClient) {}

	/**
	 * Sync the commands from the bot with the commands registered with Discord
	 */
	public async start() {
		try {
			const existingCommands = await this.getRegisteredCommand();
			const botCommands = this.client.commandHandler.commands;
			const unknown = existingCommands.filter((cmd) => !botCommands.get(cmd.name));

			this.client.logger.debug(
				`(CommandRegistry): Received ${existingCommands.size} registered commands and ${botCommands.size} bot commands.`
			);

			let count = 0;
			for (const different of [...this.getDifferences(existingCommands, botCommands)]) {
				count++;

				try {
					if (different.discord) {
						this.client.logger.debug(
							`(CommandRegistry): Updating a new command with name: ${bold(different.command.command.name)} because ${bold(
								different.command.result
							)} was different.`
						);
						await different.discord.edit(this.getCommandData(different.command.command));
						return;
					}

					this.client.logger.debug(`(CommandRegistry): Creating a new command with name: ${bold(different.command.command.name)}.`);
					await this.client.application?.commands.create(this.getCommandData(different.command.command));
				} catch (error) {
					this.client.logger.fatal(
						`(CommandRegistry): unable to update/create a command with name: ${bold(different.command.command.name)}.`
					);
					void this.client.errorHandler.handleError(error);
				}
			}

			this.client.logger.debug(`(CommandRegistry): Updated/Created a total of ${count} commands.`);

			const deleted = await Promise.all(unknown.map((cmd) => cmd.delete()));
			this.client.logger.debug(`(CommandRegistry): Deleted a total of ${deleted.length} unknown commands.`);
		} catch (error) {
			void this.client.errorHandler.handleError(error);
		}
	}

	/**
	 * Gets the already registered commands from Discord
	 */
	private async getRegisteredCommand() {
		const commands = await this.client.application?.commands.fetch({ withLocalizations: true });
		if (!commands)
			throw new InteractionHandlerError(
				"invalidFetchedCommands",
				`Expected '<Client>.application.commands.fetch()' to return 'Collection of ApplicationCommands' but received 'undefined'.`
			);

		return commands;
	}

	private *getDifferences(
		discord: Collection<string, ApplicationCommand>,
		commands: Collection<string, Command>
	): Generator<
		{
			command: {
				command: Command;
				result: string;
			};
			discord?: ApplicationCommand;
		},
		void,
		unknown
	> {
		const [registered, unregistered] = commands.partition((cmd) => Boolean(discord.find((dCmd) => dCmd.name === cmd.name)));
		const different = registered
			.map((cmd) => {
				const result = this.isDifferent(discord.find((dCmd) => dCmd.name === cmd.name)!, cmd);
				return {
					result,
					command: cmd
				};
			})
			.filter((res) => Boolean(res.result));

		// first return the commands which aren't registered yet
		for (const command of [...unregistered.values()]) {
			const obj = {
				command: {
					result: "",
					command
				}
			};

			yield obj;
		}

		// after that return the commands which are registered
		for (const command of [...different.values()]) {
			const obj = {
				discord: discord.find((dCmd) => dCmd.name === command.command.name)!,
				command: command as {
					command: Command;
					result: string;
				}
			};

			yield obj;
		}
	}

	/**
	 * Returns a object key or null depending on if the objects are different or not
	 * @param discord the Discord ApplicationCommand
	 * @param command the bot Command
	 */
	private isDifferent(discord: ApplicationCommand, command: Command): string | null {
		// @ts-ignore Re-assigning value to make sure Lodash does not return false when checking
		discord.nameLocalizations ??= undefined;

		if (!_.isEqual(discord.nameLocalizations, command.nameLocalizations)) return "nameLocalizations";
		if (!_.isEqual(discord.descriptionLocalizations, command.descriptions)) return "descriptionLocalizations";
		if (discord.description !== command.description) return "description";

		if (discord.dmPermission !== command.permissions.dm) return "dmPermission";
		if (!_.isEqual(discord.defaultMemberPermissions, command.permissions.default ? new PermissionsBitField(command.permissions.default) : null))
			return "defaultMemberPermissions";

		if (this.optionsAreDifferent(discord.options, command.options)) return "options";

		return null;
	}

	private optionsAreDifferent(discord: ApplicationCommandOption[], command: ApplicationCommandOption[]): boolean {
		// Expected options but received no options
		if (!discord.length && command.length) return true;
		// Expected no options but received options
		if (discord.length && !command.length) return true;

		// Check to see if commands here include options which aren't at Discord
		if (command.some((opt) => !discord.find((o) => o.name === opt.name))) return true;
		// Check to see if commands at Discord include options which aren't here
		if (discord.some((opt) => !command.find((o) => o.name === opt.name))) return true;

		// Map over all options to see if they are the same
		for (const option of command) {
			const existingOption = discord.find((opt) => opt.name === option.name);
			if (this.isOptionDifferent(existingOption, option)) return true;
		}

		return false;
	}

	private isOptionDifferent(discord: ApplicationCommandOption | undefined, command: ApplicationCommandOption): boolean {
		// Expected DiscordOption but received undefined
		if (!discord) return true;

		// check the name localizations
		discord.nameLocalizations ??= undefined;
		if (!_.isEqual(discord.nameLocalizations, command.nameLocalizations)) return true;
		// check the description localizations
		if (!_.isEqual(discord.nameLocalizations, command.descriptionLocalizations)) return true;
		// check the description
		if (discord.description !== command.description) return true;

		// Check the type
		if (discord.type !== command.type) return true;
		// check if autocomplete is different
		if ((discord.autocomplete ?? false) !== (command.autocomplete ?? false)) return true;
		// check if required
		if ("required" in discord) {
			const cmd = command as typeof discord;
			if ((discord.required ?? false) !== (cmd.required ?? false)) return true;
		}

		switch (discord.type) {
			case ApplicationCommandOptionType.SubcommandGroup:
			case ApplicationCommandOptionType.Subcommand: {
				const disc = discord as ApplicationCommandSubGroup;
				const cmd = command as ApplicationCommandSubGroup;
				return this.optionsAreDifferent(disc.options!, cmd.options!);
			}
			case ApplicationCommandOptionType.String:
				{
					const cmd = command as ApplicationCommandStringOption | ApplicationCommandAutocompleteStringOption;
					const disc = discord as ApplicationCommandStringOption | ApplicationCommandAutocompleteStringOption;
					if (!_.isEqual(disc.maxLength, cmd.maxLength)) return true;
					if (!_.isEqual(disc.minLength, cmd.minLength)) return true;

					// Expected choices but got undefined (and reversed)
					if ("choices" in disc && !("choices" in cmd)) return true;
					if (!("choices" in disc) && "choices" in cmd) return true;

					if ("choices" in disc && "choices" in cmd) {
						const discChoices = disc.choices ?? [];
						const cmdChoices = cmd.choices ?? [];

						const someChoice = (choice: ApplicationCommandOptionChoiceData<string>) => {
							const discChoice = discChoices.find((c) => c.name === choice.name);
							if (!discChoice) return true;

							if (!_.isEqual(discChoice.nameLocalizations, choice.nameLocalizations)) return true;
							if (typeof discChoice.value !== typeof choice.value) return true;
							if (discChoice.value !== choice.value) return true;

							return false;
						};

						// one of the items has more than expected
						if (discChoices.length !== cmdChoices.length) return true;
						if (cmdChoices.some(someChoice)) return true;
					}
				}
				break;
			case ApplicationCommandOptionType.Channel:
				{
					const disc = discord as ApplicationCommandChannelOption;
					const cmd = command as ApplicationCommandChannelOption;

					if (disc.channelTypes?.length !== cmd.channelTypes?.length) return true;
					if (!_.isEqual(disc.channelTypes, cmd.channelTypes)) return true;
				}
				break;
			case ApplicationCommandOptionType.Integer:
			case ApplicationCommandOptionType.Number:
				{
					const cmd = command as ApplicationCommandNumericOption | ApplicationCommandAutocompleteNumericOption;
					const disc = discord as ApplicationCommandNumericOption | ApplicationCommandAutocompleteNumericOption;
					if (!_.isEqual(disc.maxValue, cmd.maxValue)) return true;
					if (!_.isEqual(disc.minValue, cmd.minValue)) return true;
				}
				break;
			default:
				break;
		}

		return false;
	}

	/** Returns an object with all the necessary data to register a command */
	private getCommandData(command: Command) {
		return {
			name: command.name,
			nameLocalizations: command.nameLocalizations,
			description: command.description,
			descriptionLocalizations: command.descriptions,
			dmPermission: command.permissions.dm,
			defaultMemberPermissions: command.permissions.default ? new PermissionsBitField(command.permissions.default) : null,
			type: ApplicationCommandType.ChatInput,
			options: command.options
		};
	}
}
