import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError } from "../Errors/InteractionHandlerError.js";
import { join } from "node:path";
import { Collection } from "discord.js";
import { Command } from "../structures/Command.js";
import { CommandRegistry } from "./CommandRegistryHandler.js";

export class CommandHandler {
	/** All the available commands */
	public commands = new Collection<string, Command>();
	/** The registry handler responsible for registering all the commands */
	public registry: CommandRegistry;

	public constructor(public client: IgloClient, public directory: string) {
		this.registry = new CommandRegistry(client);
	}

	/**
	 * Loads all the commands
	 * @returns The amount of commands that were loaded
	 * @throws InterActionHandlerError
	 */
	public async loadCommands(): Promise<number> {
		if (!existsSync(this.directory)) throw new InteractionHandlerError("InvalidDirectory", `"${this.directory}" does not exist`);

		const data = await readdir(this.directory);
		const categories = data.filter((str) => !/\.[0-9a-z]+$/i.test(str));

		for (const category of categories) {
			const files = await readdir(join(this.directory, category));
			const validFiles = files.filter((str) => str.endsWith(".js") || str.endsWith(".cjs") || str.endsWith(".mjs"));

			for (const file of validFiles) {
				const { default: command } = await import(join(this.directory, category, file));
				const cmd = new command(this.client);

				if (!(cmd instanceof Command))
					this.client.logger.warn(`(CommandHandler): "${file}" does not contain a Command extended default export.`);

				cmd.load({ category, filename: file });
				this.commands.set(cmd.name, cmd);
			}
		}

		return this.commands.size;
	}

	/**
	 * Reloads all present commands
	 * @throws InterActionHandlerError
	 */
	public async reloadCommands(): Promise<void> {
		this.client.logger.debug("(CommandHandler): Reloading all commands...");

		this.commands.forEach((cmd) => cmd.unload());
		this.commands = new Collection<string, Command>();
		await this.loadCommands();

		this.client.logger.debug("(CommandHandler): Successfully reloaded all commands.");
	}

	/**
	 * Unloads a command if present in the cache
	 * @param name The name of the command
	 * @returns Boolean depending on command presence in cache
	 */
	public unloadCommand(name: string): boolean {
		const command = this.commands.get(name);
		if (command) {
			command.unload();
			this.commands.delete(name);

			this.client.logger.debug(`(CommandHandler): Successfully unloaded ${command.name}`);

			return true;
		}

		return false;
	}

	/**
	 * Loads a command if not yet present in the cache
	 * @param category The category in which the file is located
	 * @param file The file name of the command
	 * @returns Boolean depending on command presence in cache (true = already present)
	 * @throws InterActionHandlerError
	 */
	public async loadCommand(category: string, file: string): Promise<boolean> {
		const { default: command } = await import(join(this.directory, category, file));
		const cmd = new command(this.client);

		if (!(cmd instanceof Command))
			throw new InteractionHandlerError("InvalidStructureClass", `"${file}" does not contain a Command extended default export`);
		if (this.commands.has(cmd.name)) return false;

		cmd.load({ category, filename: file });
		this.commands.set(cmd.name, cmd);

		this.client.logger.debug(`(CommandHandler): Successfully loaded ${cmd.name}`);

		return true;
	}

	/**
	 * Reloads a command
	 * @param name The name of the command
	 * @returns Boolean depending on command presence in cache
	 *@throws InterActionHandlerError
	 */
	public async reloadCommand(name: string): Promise<boolean> {
		const command = this.commands.get(name);
		if (command) {
			command.unload();
			const bool = await this.loadCommand(command.category, command.filename);

			this.client.logger.debug(`(CommandHandler): Successfully reloaded ${command.name}`);

			return bool;
		}

		return false;
	}
}
