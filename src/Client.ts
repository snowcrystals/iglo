import { Client, GatewayIntentBits } from "discord.js";
import { CommandHandler } from "./handlers/CommandHandler.js";
import { ErrorHandler } from "./handlers/ErrorHandler.js";
import { EventHandler } from "./handlers/EventHandler.js";
import { InteractionHandler } from "./handlers/InteractionHandler.js";
import { Logger } from "@snowcrystals/icicle";
import type { IgloClientOptions } from "./types.js";

export class IgloClient extends Client {
	public commandHandler: CommandHandler;
	public eventHandler: EventHandler;
	public interactionHandler: InteractionHandler;
	public errorHandler = new ErrorHandler(this);

	public logger: Logger;

	public constructor(options: IgloClientOptions) {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.GuildMembers
			]
		});

		this.logger = new Logger(options.logger);
		this.commandHandler = new CommandHandler(this, options.paths.commands);
		this.eventHandler = new EventHandler(this, options.paths.events);
		this.interactionHandler = new InteractionHandler(this, options.paths.interactions);
	}

	/**
	 * Starts the bot and all its sub programs
	 */
	public async run(token: string): Promise<void> {
		const commands = await this.commandHandler.loadCommands();
		const events = await this.eventHandler.loadEvents();
		const interactions = await this.interactionHandler.loadInteractions();

		this.logger.debug(`(CommandHandler): Loaded a total of ${commands} Commands.`);
		this.logger.debug(`(EventHandler): Loaded a total of ${events} EventListeners.`);
		this.logger.debug(`(InteractionHandler): Loaded a total of ${interactions} InteractionListeners.`);

		await this.login(token);
	}
}
