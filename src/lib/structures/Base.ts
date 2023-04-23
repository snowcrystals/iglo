import type { IgloClient } from "../Client.js";

export class Base<Client extends IgloClient> {
	/** The Discord client to interact with Discord */
	public client: Client;

	public constructor(client: Client, options: Record<string, unknown> = {}) {
		this.client = client;
		options;
	}
}
