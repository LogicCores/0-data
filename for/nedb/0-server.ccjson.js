
exports.forLib = function (LIB) {
    var ccjson = this;

    const CONTEXTS = require("../../../../lib/logic.cores/0-server.boot").boot(LIB);

    const NEDB = require("nedb");

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                self.AspectInstance = function (aspectConfig) {

                    var config = {};
                    LIB._.merge(config, defaultConfig);
                    LIB._.merge(config, instanceConfig);
                    LIB._.merge(config, aspectConfig);
                    config = ccjson.attachDetachedFunctions(config);

                    var tables = {};

                    var context = {
                        adapter: {
                            nedb: function (table, query) {
                                return LIB.Promise.promisify(function (callback) {
                                    if (!tables[table]) {
                                        return callback(new Error("Table '" + table + "' not declared!"));
                                    }
                                    try {
                                        return query(tables[table], function (err, docs) {
                                            if (err) return callback(err);
                                            if (Array.isArray(docs)) {
                                                docs.forEach(function (doc) {
                                                    if (doc._id) {
                                                        doc.id = doc._id;
                                                        delete doc._id;
                                                    }
                                                });
                                            } else {
                                                if (docs._id) {
                                                    docs.id = docs._id;
                                                    delete docs._id;
                                                }
                                            }
                                            return callback(null, docs);
                                        });
                                    } catch (err) {
                                        console.error("query error:", err.stack);
                                        return callback(err);
                                    }
                                })();
                            }
                        }
                    };

                    var contexts = new CONTEXTS.adapters.context.server.Context({
                        "data": {
                            "config": {},
                            "adapters": {
                                "mapper": "ccjson.record.mapper"
                            }
                        },
                        "time": {
                            "adapters": {
                                "moment": "moment"
                            }
                        }
                    });

                    function loadTableStores () {
                        if (!config.collectionsPath) {
                            return LIB.Promise.resolve();
                        }
                        return contexts.adapters.data.mapper.loadCollectionModelsForPath(config.collectionsPath).then(function (models) {
                            return LIB.Promise.all(Object.keys(models).map(function (name) {
                                var collectionModelInstance = models[name];
                                
                                tables[name] = new NEDB(LIB._.assign(LIB._.cloneDeep(config.nedb), {
                                    filename: config.nedb.filename + "." + name
                                }));
                            }));
                        });
                    }


                    function seedCollections () {
                        if (!config.collectionsPath) {
                            return LIB.Promise.resolve();
                        }
                        return contexts.adapters.data.mapper.loadCollectionSeedsForPath(config.collectionsPath).then(function (seeds) {
                            return LIB.Promise.all(Object.keys(seeds).map(function (name) {
                                var collectionSeedInstance = seeds[name];
                                
                                var db = tables[name];
                                if (!db) {
                                    throw new Error("Table with name '" + name + "' needed to load seed not found!");
                                }

                                function replaceRecords () {
                                    var records = collectionSeedInstance.records["@replace"];
                                    if (!records) {
                                        return LIB.Promise.resolve();
                                    }
                                    return LIB.Promise.promisify(function (callback) {
                                        var waitfor = LIB.waitfor.parallel(callback);
                                        Object.keys(records).forEach(function (id) {
                                            waitfor(function (done) {
                                                db.update({
                                                    _id: id
                                                }, LIB._.assign({
                                                    _id: id
                                                }, records[id]), {
                                                    upsert: true
                                                }, function (err, numReplaced) {
                                                    if (err) return done();
                                                    return done();
                                                });
                                            });
                                        });
                                        return waitfor;
                                    })();
                                }

                                return replaceRecords().then(function () {
        
                                    // TODO: Optionally disable this
                                    db.persistence.compactDatafile();
                                });
                            }));
                        });
                    }

                    return loadTableStores().then(function () {
                        return seedCollections().then(function () {
                            return LIB.Promise.resolve({
                                app: function () {
                                    return LIB.Promise.resolve(
                                        ccjson.makeDetachedFunction(
                                            function (req, res, next) {
                                                if (
                                                    config.request &&
                                                    config.request.contextAlias
                                                ) {
                                                    if (!req.context) {
                                                        req.context = {};
                                                    }
                                                    req.context[config.request.contextAlias] = context;
                                                }
                                                return next();
                                            }
                                        )
                                    );
                                }
                            });
                        });
                    });
                }

            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
