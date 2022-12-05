import type { LoggerOptions } from "@snowcrystals/icicle";
import type { ClientOptions } from "discord.js";
import type { ErrorHandler } from "./index.js";

export interface IgloClientOptions {
	/** Options for the built-in logger from [@snowcrystals/icicle](https://github.com/snowcrystals/icicle) */
	logger?: LoggerOptions;
	/** A custom ErrorHandler class for handling errors */
	errorHandler?: ErrorHandler;
	/** The Discord.js Client Options */
	client: ClientOptions;
	/** The paths for the different types of handlers that should be read */
	paths: {
		/** example: src/bot/events */
		events: string;
		/** example: src/bot/commands */
		commands: string;
		/** example: src/bot/interactions */
		interactions: string;
	};
}
