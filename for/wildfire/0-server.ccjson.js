
exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);

                var context = config.context();


//console.log("WILDFIRE config", config);

                var api = {
                    
                };

                context.setAdapterAPI(api);
                context.setAspectConfig({});
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
