import type { IgloClient } from "../Client.js";

export class Base {
	/** The Discord client to interact with Discord */
	public client: IgloClient;

	public constructor(client: IgloClient, options: Record<string, unknown> = {}) {
		this.client = client;
		options;
	}
}
