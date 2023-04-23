import type { IgloClient } from "../Client.js";
import type { Base } from "../structures/Base.js";
import type { CommandOptions } from "../structures/Command.js";
import type { EventListenerOptions } from "../structures/EventListener.js";
import { type ApplyOptionsParam, createClassDecorator, createProxy, type ConstructorType } from "./utils.js";

type ApplyOptionTypes = CommandOptions | EventListenerOptions;

/**
 * Applies the ConstructorOptions to a Command | EventListener extended class
 * @param result The ConstructorOptions or a function to get the ConstructorOptions from
 */
export function ApplyOptions<Options extends ApplyOptionTypes, Client extends IgloClient = IgloClient>(
	result: ApplyOptionsParam<Options>
): ClassDecorator {
	const getOptions = (client: Client) => (typeof result === "function" ? result(client) : result);

	return createClassDecorator((target: ConstructorType<ConstructorParameters<typeof Base>, Base<Client>>) =>
		createProxy(target, {
			construct: (constructor, [client, baseOptions = {}]: [Client, Partial<Options>]) =>
				new constructor(client, { ...baseOptions, ...getOptions(client) })
		})
	);
}
