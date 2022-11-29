export class InteractionHandlerError extends Error {
	public type: InteractionHandlerErrorType;

	public constructor(errorType: InteractionHandlerErrorType, message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "InteractionHandlerError";
		this.type = errorType;
	}
}

type InteractionHandlerErrorType =
	| "InvalidDirectory"
	| "InvalidStructureClass"
	| "noConstructorOptions"
	| "invalidFetchedCommands"
	| "unknownCommand";
