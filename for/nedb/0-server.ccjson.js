
exports.forLib = function (LIB) {

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;
                
                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);

//console.log("INIT NEDB ENTITY!", config);

            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
