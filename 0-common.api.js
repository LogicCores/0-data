
exports.forLib = function (LIB) {

    var exports = {};

    exports.adapters = {};

    exports.forContexts = function (contexts) {

        var exports = {};

        var Context = exports.Context = function (defaults) {
            var self = this;

            var state = {
                collections: {},
            };
            LIB._.merge(state, LIB._.cloneDeep(defaults));

            self.config = defaults;

            self.getCollectionsInitialData = function () {
                return defaults.collectionsInitialData;
            }

            self.registerCollection = function (alias, collection) {
                if (state.collections[alias]) {
                    throw new Error("Collection for alias '" + alias + "' already registered!");
                }
                state.collections[alias] = collection;
                self.emit("collection:registered", collection);
            }

            self.getCollection = function (alias) {
                return state.collections[alias];
            }

            // HACK: Remove once data loading is subscribed per component
            self.notifyInitialized = function () {
                self.emit("initialized");
            }

            // TODO: Add a 'subscribe()' method that allows a consumer to subscribe to data
            //       records which get fetched async in batch and then are available sync at runtime.
        }
        Context.prototype = Object.create(LIB.EventEmitter.prototype);
        Context.prototype.contexts = contexts;

        return exports;
    }

    return exports;
}
