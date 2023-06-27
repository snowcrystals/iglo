import { bold } from "colorette";
import type {
	AutocompleteInteraction,
	CacheType,
	CommandInteraction,
	Interaction,
	MessageComponentInteraction,
	ModalSubmitInteraction
} from "discord.js";
import { ApplyOptions, type EventListenerOptions, EventListener, InteractionHandlerError } from "../index.js";

@ApplyOptions<EventListenerOptions>({
	name: "interactionCreate"
})
export default class extends EventListener {
	public override run(interaction: Interaction) {
		if (interaction.isCommand()) return this.commandInteraction(interaction);
		if (interaction.isAutocomplete()) return this.autocompleteInteraction(interaction);
		if (interaction.isMessageComponent() || interaction.isModalSubmit()) return this.customIdTypeInteraction(interaction);
	}

	public commandInteraction(interaction: CommandInteraction): void {
		const command = this.client.commandHandler.commands.get(interaction.commandName);
		if (!command)
			return void this.client.errorHandler.handleError(
				new InteractionHandlerError("unknownCommand", `Interaction with name: ${bold(interaction.commandName)} is missing a command.`),
				interaction as Interaction
			);

		void command._run(interaction);
	}

	public autocompleteInteraction(interaction: AutocompleteInteraction): void {
		const command = this.client.commandHandler.commands.get(interaction.commandName);
		if (!command)
			return void this.client.errorHandler.handleError(
				new InteractionHandlerError(
					"unknownCommand",
					`AutocompleteInteraction with name: ${bold(interaction.commandName)} is missing a command.`
				),
				interaction as Interaction
			);

		void command._autocomplete(interaction);
	}

	public customIdTypeInteraction(interaction: MessageComponentInteraction<CacheType> | ModalSubmitInteraction<CacheType>) {
		const CheckFunction = (str: string, strategy: "equal" | "include" | "endsWith" | "startsWith", check?: (str: string) => boolean) => {
			if (typeof check === "function") return check(interaction.customId);
			switch (strategy) {
				case "include":
					return interaction.customId.includes(str);
				case "startsWith":
					return interaction.customId.startsWith(str);
				case "endsWith":
					return interaction.customId.endsWith(str);
				case "equal":
				default:
					return interaction.customId === str;
			}
		};

		const interactionListener = this.client.interactionHandler.interactions.find((intListener) =>
			CheckFunction(intListener.name, intListener.strategy, intListener.check)
		);
		if (!interactionListener) return;
		if (interaction.isMessageComponent() && interaction.componentType !== interactionListener.type) return;
		else if (!interaction.isMessageComponent() && interaction.type !== interactionListener.type) return;

		void interactionListener._run(interaction as any);
	}
}
