import type { IgloClient } from "../Client.js";

/**
 * Creates a new proxy to efficiently add properties to class without creating subclasses
 * @param target The constructor of the class to modify
 * @param handler The handler function to modify the constructor behavior for the target
 * @hidden
 * @copyright Original version: https://github.com/sapphiredev/utilities/tree/main/packages/decorators
 */
export function createProxy<T extends object>(target: T, handler: Omit<ProxyHandler<T>, "get">): T {
	return new Proxy(target, {
		...handler,
		get: (target, property) => {
			const value = Reflect.get(target, property);
			return typeof value === "function" ? (...args: readonly unknown[]) => value.apply(target, args) : value;
		}
	});
}

/**
 * Create a class Decorator with easy typings
 */
export function createClassDecorator<F extends TFunction>(fn: F): ClassDecorator {
	return fn;
}

export type ConstructorType<Args extends readonly any[] = readonly any[], Res = any> = new (...args: Args) => Res;
export type ApplyOptionsParam<T> = T | ((client: IgloClient) => T);
export type TFunction = (...args: any[]) => void;
