import {
	ApplicationCommand,
	ApplicationCommandAutocompleteNumericOption,
	ApplicationCommandAutocompleteStringOption,
	ApplicationCommandChannelOption,
	ApplicationCommandData,
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
import { bold } from "colorette";
import _ from "lodash";
import type { DifferenceData, Differences } from "../types.js";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError, Command } from "../index.js";

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
							`(CommandRegistry): Updating a new command with name: ${bold(
								different.command.command.name
							)} the following as different:`,
							...different.command.differences
						);
						await this.updateCommand(different.discord, different.command.command);
					} else {
						this.client.logger.debug(`(CommandRegistry): Creating a new command with name: ${bold(different.command.command.name)}.`);
						await this.client.application?.commands.create(this.getCommandData(different.command.command));
					}
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
		const commands = await this.client.application?.commands.fetch({ withLocalizations: true, force: true });
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
				differences: Differences;
			};
			discord?: ApplicationCommand;
		},
		void,
		unknown
	> {
		const [registered, unregistered] = commands.partition((cmd) => Boolean(discord.find((dCmd) => dCmd.name === cmd.name)));
		const different = registered
			.map((cmd) => {
				const differences = this.isDifferent(discord.find((dCmd) => dCmd.name === cmd.name)!, cmd);
				return {
					differences,
					command: cmd
				};
			})
			.filter((res) => res.differences.length > 0);

		// first return the commands which aren't registered yet
		for (const command of [...unregistered.values()]) {
			const obj = {
				command: {
					differences: [],
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
					differences: Differences;
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
	private isDifferent(discord: ApplicationCommand, command: Command): Differences {
		const differences: Differences = [];

		// Check NameLocalizations
		differences.push(...this.checkLocalization(discord.nameLocalizations ?? {}, command.nameLocalizations ?? {}, "nameLocalizations"));
		// Check NameLocalizations
		differences.push(...this.checkLocalization(discord.descriptionLocalizations ?? {}, command.descriptions ?? {}, "descriptionLocalizations"));
		// Check description
		if (discord.description !== command.description)
			differences.push({ key: "description", expected: command.description, received: discord.description });

		// check DM Permissions
		if (discord.dmPermission !== command.permissions.dm)
			differences.push({ key: "dmPermission", expected: command.permissions.dm, received: discord.dmPermission });
		// Check member Permissions
		const discordPermissions = discord.defaultMemberPermissions;
		const commandPermissions = command.permissions.default ? new PermissionsBitField(command.permissions.default) : null;
		if (discordPermissions && !commandPermissions)
			differences.push({ key: "defaultMemberPermissions", expected: null, received: discordPermissions.bitfield });
		else if (!discordPermissions && commandPermissions)
			differences.push({ key: "defaultMemberPermissions", expected: commandPermissions.bitfield, received: null });
		else if (discordPermissions && commandPermissions && !_.isEqual(discordPermissions, commandPermissions))
			differences.push({ key: "defaultMemberPermissions", expected: commandPermissions.bitfield, received: discordPermissions.bitfield });

		// const optionsRes = this.optionsAreDifferent(discord.options, command.options);
		// differences.push(...optionsRes);

		return differences;
	}

	private optionsAreDifferent(discord: ApplicationCommandOption[], command: ApplicationCommandOption[]): Differences {
		const differences: Differences = [];

		// Check Options length
		if (command.length !== discord.length) differences.push({ key: "options", expected: command.length, received: discord.length });

		// Check to see if commands here include options which aren't at Discord
		const missing = command.filter((opt) => !discord.find((o) => o.name === opt.name));
		differences.push(...missing.map<DifferenceData>((opt) => ({ key: `option[${opt.name}]`, expected: "object", received: "undefined" })));
		// Check to see if commands at Discord include options which aren't here
		const existing = discord.filter((opt) => !command.find((o) => o.name === opt.name));
		differences.push(...existing.map<DifferenceData>((opt) => ({ key: `option[${opt.name}]`, expected: "undefined", received: "object" })));

		// Map over all options to see if they are the same
		let index = 0;
		for (const option of command) {
			const existingOption = discord.find((opt) => opt.name === option.name);
			if (!existingOption) continue; // Ignore missing options, already addressed above.

			const optionsRes = this.isOptionDifferent(existingOption, option, index);
			if (optionsRes) differences.push(...optionsRes);

			index++;
		}

		return differences;
	}

	private isOptionDifferent(discord: ApplicationCommandOption, command: ApplicationCommandOption, index: number): Differences {
		const differences: Differences = [];
		const optionIndex = `option[${index}]`;

		// Check NameLocalizations
		differences.push(
			...this.checkLocalization(discord.nameLocalizations ?? {}, command.nameLocalizations ?? {}, `${optionIndex}.nameLocalizations`)
		);
		// Check NameLocalizations
		differences.push(
			...this.checkLocalization(
				discord.descriptionLocalizations ?? {},
				command.descriptionLocalizations ?? {},
				`${optionIndex}.descriptionLocalizations`
			)
		);
		// Check description
		if (discord.description !== command.description)
			differences.push({ key: `${optionIndex}.description`, expected: command.description, received: discord.description });

		// Check the type
		if (discord.type !== command.type)
			differences.push({
				key: `${optionIndex}.type`,
				expected: ApplicationCommandOptionType[command.type],
				received: ApplicationCommandOptionType[discord.type]
			});
		// check if autocomplete is different
		if ((discord.autocomplete ?? false) !== (command.autocomplete ?? false))
			differences.push({ key: `${optionIndex}.autocomplete`, expected: command.autocomplete, received: discord.autocomplete });

		// check if required
		if ("required" in discord) {
			const cmd = command as typeof discord;
			if ((discord.required ?? false) !== (cmd.required ?? false))
				differences.push({ key: `${optionIndex}.required`, expected: cmd.required, received: discord.required });
		}

		switch (discord.type) {
			case ApplicationCommandOptionType.SubcommandGroup:
			case ApplicationCommandOptionType.Subcommand: {
				const disc = discord as ApplicationCommandSubGroup;
				const cmd = command as ApplicationCommandSubGroup;
				return this.optionsAreDifferent(disc.options ?? [], cmd.options ?? []);
			}
			case ApplicationCommandOptionType.String:
				{
					const cmd = command as ApplicationCommandStringOption | ApplicationCommandAutocompleteStringOption;
					const disc = discord as ApplicationCommandStringOption | ApplicationCommandAutocompleteStringOption;
					if (!_.isEqual(disc.maxLength, cmd.maxLength))
						differences.push({ key: `${optionIndex}.maxLength`, expected: cmd.maxLength, received: disc.maxLength });
					if (!_.isEqual(disc.minLength, cmd.minLength))
						differences.push({ key: `${optionIndex}.minLength`, expected: cmd.minLength, received: disc.minLength });

					// @ts-ignore Discord data returns undefined if no choices are passed, we should do the same with local data
					cmd.choices ??= undefined;
					if ("choices" in disc && "choices" in cmd) {
						const discChoices = disc.choices ?? [];
						const cmdChoices = cmd.choices ?? [];

						const someChoice = (choice: ApplicationCommandOptionChoiceData<string>) => {
							const discChoice = discChoices.find((c) => c.name === choice.name);
							if (!discChoice) return true;

							if (!_.isEqual(discChoice.nameLocalizations, choice.nameLocalizations)) return "choices-nameLocalizations";
							if (typeof discChoice.value !== typeof choice.value) return "choices-value";
							if (discChoice.value !== choice.value) return "choices-value";

							return false;
						};

						// one of the items has more than expected
						if (discChoices.length !== cmdChoices.length)
							differences.push({ key: `${optionIndex}.choices.length`, expected: cmdChoices.length, received: discChoices.length });
						if (cmdChoices.some(someChoice))
							differences.push({ key: `${optionIndex}.choices`, expected: cmdChoices, received: discChoices });
					}
				}
				break;
			case ApplicationCommandOptionType.Channel:
				{
					const disc = discord as ApplicationCommandChannelOption;
					const cmd = command as ApplicationCommandChannelOption;

					if (disc.channelTypes?.length !== cmd.channelTypes?.length || !_.isEqual(cmd.channelTypes, disc.channelTypes))
						differences.push({ key: `${optionIndex}.channelTypes`, expected: cmd.channelTypes, received: disc.channelTypes });
				}
				break;
			case ApplicationCommandOptionType.Integer:
			case ApplicationCommandOptionType.Number:
				{
					const cmd = command as ApplicationCommandNumericOption | ApplicationCommandAutocompleteNumericOption;
					const disc = discord as ApplicationCommandNumericOption | ApplicationCommandAutocompleteNumericOption;
					if (!_.isEqual(disc.maxValue, cmd.maxValue))
						differences.push({ key: `${optionIndex}.maxValue`, expected: cmd.maxValue, received: disc.maxValue });
					if (!_.isEqual(disc.minValue, cmd.minValue))
						differences.push({ key: `${optionIndex}.minValue`, expected: cmd.minValue, received: disc.minValue });
				}
				break;
			default:
				break;
		}

		return differences;
	}

	private checkLocalization(discord: Record<string, string | null>, command: Record<string, string | null>, objectKey: string): Differences {
		const differences: Differences = [];
		Object.keys(command).forEach((key) => {
			const received = discord[key];
			const expected = command[key];
			if (!received || received !== expected) differences.push({ key: objectKey, expected, received });
		});

		return differences;
	}

	private async updateCommand(discord: ApplicationCommand, command: Command) {
		const data = this.getCommandData(command);
		await discord.edit(data);
	}

	/** Returns an object with all the necessary data to register a command */
	private getCommandData(command: Command): ApplicationCommandData {
		return {
			name: command.name,
			description: command.description,
			nameLocalizations: command.nameLocalizations ?? {},
			descriptionLocalizations: command.descriptions ?? {},
			dmPermission: command.permissions.dm,
			defaultMemberPermissions: command.permissions.default ? new PermissionsBitField(command.permissions.default) : null,
			type: ApplicationCommandType.ChatInput,
			options: command.options
		};
	}
}
