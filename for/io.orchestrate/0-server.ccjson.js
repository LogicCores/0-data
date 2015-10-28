
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


                function getDB (query) {
                    if (!getDB._impl) {
                        getDB._impl = require('orchestrate')(
                            config.token,
                            config.apiEndpoint
                        );
                    }
                    return new LIB.Promise(function (resolve, reject) {
                        return query(getDB._impl).then(resolve).fail(function (err) {
                            console.error("Error calling orchestrate.io API:", err.body || err);
                            return reject(new Error(err.body.message || err.toString()));
                        });
                    });
                }


                var api = {
                    adapter: {
                        db: function (query) {
                            return getDB(query);
                        }
                    }
                };

                context.setAdapterAPI(api);


                self.AspectInstance = function (aspectConfig) {

                    var config = {};
                    LIB._.merge(config, defaultConfig);
                    LIB._.merge(config, instanceConfig);
                    LIB._.merge(config, aspectConfig);
                    config = ccjson.attachDetachedFunctions(config);

                    return LIB.Promise.resolve({
                        logger: function () {

                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(
                                    function (fields) {

                                        return getDB(function (db) {
                                            return db.post(config.collection, fields);
                                        }).then(function (result) {
                                            /*
                                            // success example
                                            result.path = {
                                                collection: '404.log',
                                                key: '0d61870c87119ee9',
                                                ref: 'c0c7c3sbb9e2aa7b'
                                            }
                                            */
                                        });
                                    }
                                )
                            );
                        }
                    });
                }
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
