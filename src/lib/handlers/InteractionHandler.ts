import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError } from "../Errors/InteractionHandlerError.js";
import { join } from "node:path";
import { Collection } from "discord.js";
import { InteractionListener } from "../structures/InteractionListener.js";

export class InteractionHandler {
	/** All the available interactions */
	public interactions = new Collection<string, InteractionListener>();

	public constructor(public client: IgloClient, public directory: string) {}

	/**
	 * Loads all the InteractionListeners
	 * @returns The amount of InteractionListeners that were loaded
	 * @throws InterActionHandlerError
	 */
	public async loadInteractions(): Promise<number> {
		if (!existsSync(this.directory)) throw new InteractionHandlerError("InvalidDirectory", `"${this.directory}" does not exist`);

		const data = await readdir(this.directory);
		const categories = data.filter((str) => !/\.[0-9a-z]+$/i.test(str));
		categories.push("");

		for (const category of categories) {
			const files = await readdir(join(this.directory, category));
			const validFiles = files.filter((str) => str.endsWith(".js"));

			for (const file of validFiles) {
				const { default: interactionListener } = await import(join(this.directory, category, file));
				const intListener = new interactionListener(this.client);

				if (!(intListener instanceof InteractionListener))
					this.client.logger.warn(`(InteractionHandler): "${file}" does not contain a InteractionListener extended default export.`);

				intListener.load({ category, filename: file });
				this.interactions.set(intListener.name, intListener);
			}
		}

		return this.interactions.size;
	}

	/**
	 * Reloads all present InteractionListeners
	 * @throws InterActionHandlerError
	 */
	public async reloadInteractions(): Promise<void> {
		this.client.logger.debug("(InteractionHandler): Reloading all InteractionListeners...");

		this.interactions.forEach((cmd) => cmd.unload());
		this.interactions = new Collection<string, InteractionListener>();
		await this.loadInteractions();

		this.client.logger.debug("(InteractionHandler): Successfully reloaded all InteractionListeners.");
	}

	/**
	 * Unloads an InteractionListener if present in the cache
	 * @param name The name of the InteractionListener
	 * @returns Boolean depending on InteractionListener presence in cache
	 */
	public unloadInteraction(name: string): boolean {
		const interactionListener = this.interactions.get(name);
		if (interactionListener) {
			interactionListener.unload();
			this.interactions.delete(name);

			this.client.logger.debug(`(InteractionHandler): Successfully unloaded ${interactionListener.name.toString()}`);

			return true;
		}

		return false;
	}

	/**
	 * Loads an InteractionListener if not yet present in the cache
	 * @param filepath The filepath of the InteractionListener (not absolute)
	 * @returns Boolean depending on InteractionListener presence in cache (true = already present)
	 * @throws InterActionHandlerError
	 */
	public async loadInteraction(filepath: string): Promise<boolean> {
		const { default: interactionListener } = await import(join(this.directory, filepath));
		const intListener = new interactionListener(this.client);

		if (!(intListener instanceof InteractionListener))
			throw new InteractionHandlerError(
				"InvalidStructureClass",
				`"${filepath}" does not contain a InteractionListener extended default export`
			);
		if (this.interactions.has(intListener.name)) return false;

		intListener.load({ filepath });
		this.interactions.set(intListener.name, intListener);

		this.client.logger.debug(`(InteractionHandler): Successfully loaded ${intListener.name}`);

		return true;
	}

	/**
	 * Reloads an InteractionListener
	 * @param name The name of the InteractionListener
	 * @returns Boolean depending on InteractionListeners presence in cache
	 *@throws InterActionHandlerError
	 */
	public async reloadInteraction(name: string): Promise<boolean> {
		const intListener = this.interactions.get(name);
		if (intListener) {
			intListener.unload();
			const bool = await this.loadInteraction(intListener.filepath);

			this.client.logger.debug(`(InteractionHandler): Successfully reloaded ${intListener.name}`);

			return bool;
		}

		return false;
	}
}
