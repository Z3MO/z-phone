export function createAppRegistry() {
    const handlers = new Map();

    return {
        register(name, definition) {
            if (!name || typeof name !== 'string') {
                throw new Error('App names must be non-empty strings.');
            }

            const normalizedDefinition = typeof definition === 'function'
                ? { handler: definition }
                : definition;

            if (!normalizedDefinition || typeof normalizedDefinition.handler !== 'function') {
                throw new Error(`App \"${name}\" must provide a handler function.`);
            }

            handlers.set(name, normalizedDefinition);
            return normalizedDefinition;
        },

        has(name) {
            return handlers.has(name);
        },

        open(name, context = {}) {
            const definition = handlers.get(name);
            if (!definition) {
                return false;
            }

            definition.handler({
                appName: name,
                ...context,
            });
            return true;
        },

        list() {
            return Array.from(handlers.entries()).map(([name, definition]) => ({ name, ...definition }));
        },
    };
}
