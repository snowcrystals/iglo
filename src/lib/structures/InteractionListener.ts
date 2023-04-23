import type { Awaitable, ComponentType, Interaction, InteractionType } from "discord.js";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError } from "../Errors/InteractionHandlerError.js";
import { Base } from "./Base.js";

export class InteractionListener<Client extends IgloClient = IgloClient> extends Base<Client> implements InteractionListenerOptions {
	public name: string;
	public type: InteractionType.ModalSubmit | ComponentType.Button | ComponentType.SelectMenu;

	public strategy: "include" | "equal" | "startsWith" | "endsWith";
	public check?: ((id: string) => boolean) | undefined;

	/** @internal The name of the filepath associated with the InteractionListener */
	public filepath!: string;

	public constructor(client: Client, options: InteractionListenerOptions) {
		super(client);
		if (!options) throw new InteractionHandlerError("noConstructorOptions");

		this.name = options.name;
		this.type = options.type;

		this.strategy = options.strategy ?? "equal";
		this.check = options.check;
	}

	public run(interaction: Interaction): Awaitable<void> {
		void 0; // placeholder
	}

	/**
	 * Runs when the InteractionListener is loaded
	 * @requires super callback on overwrite
	 */
	public load(options: InteractionListenerLoadOptions) {
		this.filepath = options.filepath;
	}

	/**
	 * Runs when the InteractionListener is unloaded
	 * @requires super callback on overwrite
	 */
	public unload() {
		void 0;
	}

	public async _run(interaction: Interaction): Promise<void> {
		try {
			await this.run(interaction);
		} catch (error) {
			void this.client.errorHandler.handleError(error);
		}
	}
}

export interface InteractionListenerOptions {
	/** The name (customId) of the Interaction */
	name: string;
	/** The type of interactions you accept for the listener */
	type: InteractionType.ModalSubmit | ComponentType.Button | ComponentType.SelectMenu;
	/** The strategy the handler should use to check if the interaction should be ran by this class
	 * @default "equal"
	 */
	strategy?: "include" | "equal" | "startsWith" | "endsWith";
	/** A custom check function which overwrites the default one */
	check?: (id: string) => boolean;
}

export interface InteractionListenerLoadOptions {
	filepath: string;
}
