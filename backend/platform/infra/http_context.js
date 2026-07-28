/**
 * Drop-in replacement for express-http-context using Node's built-in AsyncLocalStorage.
 *
 * express-http-context@1.x relies on cls-hooked, which can lose track of the active
 * async context when the event loop is forcefully spun (e.g. by deasync.loopWhile).
 * AsyncLocalStorage uses a different, more robust tracking mechanism that is resilient
 * to event-loop manipulation.
 *
 * API surface is identical to express-http-context:
 *   - middleware   — Express middleware that creates a per-request context store
 *   - set(key, value) — Store a value in the current request's context
 *   - get(key)        — Retrieve a value from the current request's context
 */

const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

module.exports = {

    middleware: function(req, res, next)
    {
        const store = new Map();
        asyncLocalStorage.run(store, () =>
        {
            next();
        });
    },

    set: function(key, value)
    {
        const store = asyncLocalStorage.getStore();
        if (store)
        {
            store.set(key, value);
        }
    },

    get: function(key)
    {
        const store = asyncLocalStorage.getStore();
        if (store)
        {
            return store.get(key);
        }
        return undefined;
    }
};
