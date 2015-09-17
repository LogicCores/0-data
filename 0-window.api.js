
exports.forLib = function (LIB) {

    var exports = {};

    // TODO: Load adapters as needed on demand

    exports.adapters = {
        "ccjson.record.mapper": require("./for/ccjson.record.mapper/0-window.api").forLib(LIB)
    }

    exports.forContexts = function (contexts) {

        var exports = {};

        var Context = exports.Context = function (defaults) {
            var self = this;

            var state = {
                collections: {},
            };
            LIB._.merge(state, LIB._.cloneDeep(defaults));


            self.registerCollection = function (alias, collection) {
                if (state.collections[alias]) {
                    throw new Error("Collection for alias '" + alias + "' already registered!");
                }
                state.collections[alias] = collection;
            }

            self.getCollection = function (alias) {
                return state.collections[alias];
            }
        }
        Context.prototype = Object.create(LIB.EventEmitter.prototype);
        Context.prototype.contexts = contexts;

        return exports;
    }

    return exports;
}
