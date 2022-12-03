### Examples

The following examples are written in TypeScript with decorators enabled. The examples do not show the required imports (because the only imports you will need are @snowcrystals/iglo components).

For a non-decorator version, use a constructor and move the options to the super function inside the constructor (example below)

```js
class Command extends SlashCommand {
	constructor(client) {
		super(client, options); // <-- Options are the options from the decorator
	}
}
```

#### Command Example

```ts
@ApplyOptions<CommandOptions>({
	name: "test",
	description: "Replies with 'Hello World!'"
})
class Command extends Command {
	public async run(interaction: CommandInteraction) {
		await interaction.reply("Hello World!");
	}
}
```

#### SubCommand Example

```ts
@ApplyOptions<SubCommandOptions>({
	name: "test",
	description: "Replies with 'Hello World!'",
	options: [
		{
			name: "world",
			description: "A very cool command",
			type: ApplicationCommandOptionType.Subcommand
		}
	],
	subcommands: [
		{
			name: "world",
			functionName: "world"
		}
	]
})
class Command extends SubCommand {
	public async world(interaction: CommandInteraction) {
		await interaction.reply("Hello World!");
	}
}
```

#### EventListener Example

```ts
@ApplyOptions<EventListenerOptions>({
	name: "ready",
	once: true
})
export class ReadyEvent extends EventListener {
	public run() {
		void this.client.commandHandler.registry.start();
		this.client.logger.info(`(Bot): Connected to Discord as ${bold(this.client.user?.tag ?? "")}.`);
	}
}
```

#### InteractionListener Example

```ts
@ApplyOptions<InteractionListenerOptions>({
	name: "modal",
	type: InteractionType.ModalSubmit
})
export default class extends InteractionListener {
	public async run(interaction: ModalSubmitInteraction) {
		const title = interaction.fields.getTextInputValue("contact-title");
		const description = interaction.fields.getField("contact-description");

		console.log(title, description);
		await interaction.reply({
			content: "Data received",
			ephemeral: true
		});
	}
}
```
