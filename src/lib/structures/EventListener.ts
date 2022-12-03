import type { Awaitable, ClientEvents } from "discord.js";
import type EventEmitter from "events";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError } from "../Errors/InteractionHandlerError.js";
import { Base } from "./Base.js";

export class EventListener extends Base implements EventListenerOptions {
	public name: keyof ClientEvents | string;
	public emitter: EventEmitter;
	public once?: boolean | undefined;

	/** @internal The name of the filepath associated with the event */
	public filepath!: string;

	public constructor(client: IgloClient, options: EventListenerOptions) {
		super(client);
		if (!options) throw new InteractionHandlerError("noConstructorOptions");

		this.name = options.name;
		this.emitter = options.emitter ?? this.client;
		this.once = options.once;
	}

	public run<K extends keyof ClientEvents>(...args: ClientEvents[K] | readonly any[]): Awaitable<void> {
		void 0; // placeholder
	}

	/**
	 * Runs when the command is loaded
	 * @requires super callback on overwrite
	 */
	public load(options: EventListenerLoadOptions) {
		this.filepath = options.filepath;
		this.emitter[this.once ? "once" : "on"](this.name, this._run.bind(this));
	}

	/**
	 * Runs when the Event is unloaded
	 * @requires super callback on overwrite
	 */
	public unload() {
		this.emitter.off(this.name, this.run.bind(this));
	}

	private async _run(...args: readonly any[]): Promise<void> {
		try {
			await this.run(...args);
		} catch (error) {
			void this.client.errorHandler.handleError(error);
		}
	}
}

export interface EventListenerOptions {
	/** The name of the event */
	name: string | keyof ClientEvents;
	/**
	 * Whether to run the event once or multiple times after starting the bot
	 * @default false
	 */
	once?: boolean;
	/**
	 * The emitter of the event
	 * @defaults IgloClient
	 */
	emitter?: EventEmitter;
}

export interface EventListenerLoadOptions {
	filepath: string;
}
