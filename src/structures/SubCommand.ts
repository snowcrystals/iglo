import { bold } from "colorette";
import type { Awaitable, ChatInputCommandInteraction, CommandInteraction } from "discord.js";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError } from "../Errors/InteractionHandlerError.js";
import { Command, CommandOptions } from "./Command.js";

export class SubCommand extends Command {
	public subcommands: SubCommandType[] = [];

	public constructor(client: IgloClient, options: SubCommandOptions) {
		super(client, options);

		// @ts-ignore yes you can, yes we want
		this.subcommands = options.subcommands.map((v) => ({ name: v.name, fn: this[v.functionName] }));
	}

	public override async _run(interaction: CommandInteraction): Promise<void> {
		try {
			if (!interaction.isChatInputCommand())
				throw new InteractionHandlerError(
					"unknownCommand",
					`The subcommand ${bold(this.name)} received a ${bold(interaction.type)} interaction instead of ${bold(
						"chatInputCommand"
					)} interaction.`
				);

			const subcommand = interaction.options.getSubcommand(true);
			if (!subcommand)
				throw new InteractionHandlerError(
					"unknownCommand",
					`The subcommand ${bold(this.name)} received a ${bold("chatInputCommand")} interaction without a subcommand option.`
				);

			const fn = this.subcommands.find((cmd) => cmd.name === subcommand);
			if (!fn || typeof fn.fn !== "function") {
				void interaction.followUp("The logic behind this command already left before the party could start :(");
				throw new InteractionHandlerError(
					"unknownCommand",
					`The subcommand ${bold(this.name)} received a ${bold(
						"chatInputCommand"
					)} interaction without a linked function to it (expecting a function for ${bold(subcommand)}).`
				);
			}

			try {
				await fn.fn(interaction);
			} catch (error) {
				void this.client.errorHandler.handleError(error, interaction);
			}
		} catch (error) {
			void this.client.errorHandler.handleError(error);
		}
	}
}

interface SubCommandType {
	name: string;
	fn: (interaction: ChatInputCommandInteraction) => Awaitable<void>;
}

export interface SubCommandOptions extends CommandOptions {
	subcommands: { name: string; functionName: string }[];
}
