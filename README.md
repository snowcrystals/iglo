<div align="center">
    <img src="https://raw.githubusercontent.com/snowcrystals/.github/main/logo.png" width="100px" />
    <h1>@snowcrystals/iglo</h1>
  
  <p>Just like any other Discord.js framework, but better. 🧊</p>
  
  <p align="center">
    <a href="/">
        <img alt="Version" src="https://img.shields.io/badge/version-1.2.6-blue.svg" />
    </a>
    <a href="/LICENSE" target="_blank">
      <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
    </a>
  </p>
</div>


<div align="center">
   <a href="https://ijskoud.dev/discord" target="_blank">
    <img src="https://ijskoud.dev/discord/banner" />
  </a>
  <br />
   <a href="https://vercel.com/?utm_source=snowcrystals&utm_campaign=oss" target="_blank">
    <img src="https://raw.githubusercontent.com/snowcrystals/.github/main/vercel.svg">
  </a>
</div>

---

## Information

@snowcrystals/iglo is a [Discord.js](https://discordjs.dev) framework which makes building a bot a lot easier. With its built-in SlashCommand registry system it checks updates the data once a change to the command is detected (a restart is required if code changes are made). The framework currently only supports SlashCommands (no idea why you want to use message commands now that Discord restricted the content to only a limited amount of eligible bots).

## Install

```bash
yarn add @snowcrystals/iglo
npm install @snowcrystals/iglo
```

 ### Documentation

The documentation (API Reference) can be found on our [website](https://snowcrystals.dev/docs/iglo)

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


## Author

👤 **ijsKoud**

-   Website: https://ijskoud.dev/
-   Email: <hi@ijskoud.dev>
-   Twitter: [@ijsKoud](https://ijskoud.dev/twitter)
-   Github: [@ijsKoud](https://github.com/ijsKoud)

## Donate

This will always be open source project, even if I don't receive donations. But there are still people out there that want to donate, so if you do here is the link [PayPal](https://ijskoud.dev/paypal) or to [Ko-Fi](https://ijskoud.dev/kofi). Thanks in advance! I really appriciate it <3

## License

Project is licensed under the © [**MIT License**](/LICENSE)

---
