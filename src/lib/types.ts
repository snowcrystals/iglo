import type { LoggerOptions } from "@snowcrystals/icicle";

export interface IgloClientOptions {
	/** Options for the built-in logger from [@snowcrystals/icicle](https://github.com/snowcrystals/icicle) */
	logger?: LoggerOptions;
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
