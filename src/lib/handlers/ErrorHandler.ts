import { underline, bold } from "colorette";
import { DiscordAPIError, Interaction, RESTJSONErrorCodes } from "discord.js";
import type { IgloClient } from "../Client.js";
import { InteractionHandlerError } from "../Errors/InteractionHandlerError.js";

export class ErrorHandler {
	public ignoredCodes = [RESTJSONErrorCodes.UnknownChannel, RESTJSONErrorCodes.UnknownMessage];

	public constructor(public client: IgloClient) {}

	/**
	 * Logs the error and makes sure the user is aware of the situation
	 * @param error The error that was emitted
	 * @param interaction The interaction from the user that used the bot
	 */
	public async handleError(error: Error, interaction?: Interaction): Promise<void> {
		if (error instanceof InteractionHandlerError) {
			let fatal = false;
			if (["InvalidDirectory", "noConstructorOptions"].includes(error.type)) fatal = true;

			const message = `${bold(underline(`InteractionHandlerError(${error.type})`))}: ${error.message}`;
			this.client.logger[fatal ? "fatal" : "error"](message);
		} else if (error instanceof DiscordAPIError && interaction && !this.isSilencedError(interaction.channelId ?? "", interaction.guildId, error))
			this.client.logger.error(`${bold(underline(`DiscordAPIError(${error.name})`))}: ${error.message}`);
		else this.client.logger.error(`${bold(underline(`Error(${error.name})`))}: ${error.message}`);

		if (interaction && interaction.isRepliable())
			await interaction
				.followUp({
					content:
						"Welcome to our corner of errors, a place you shouldn't come to too often. It is probably not your fault though, something on our side brought you here. Stay safe out there, if this happens again make sure to contact the support team."
				})
				.catch(() => void 0);
	}

	/**
	 * Checks if the Discord API Error is worth logging
	 * @param channelId the id of the channel the error came from
	 * @param guild the guild id the error came from
	 * @param error the Discord API Error that was returned after the request
	 */
	protected isSilencedError(channelId: string, guild: string | null, error: DiscordAPIError) {
		return this.ignoredCodes.includes(error.code as RESTJSONErrorCodes) || this.isDirectinteractionReplyAfterBlock(channelId, guild, error);
	}

	/**
	 * Checks if the error has something to do with replying to a blocked user or blocked channel
	 * @param channelId the id of the channel the error came from
	 * @param guild the guild id the error came from
	 * @param error the Discord API Error that was returned after the request
	 */
	protected isDirectinteractionReplyAfterBlock(channelId: string, guild: string | null, error: DiscordAPIError) {
		if (error.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) return false;
		if (guild !== null) return false;
		return error.url.includes(`/channels/${channelId}/messages`);
	}
}
