
exports.forLib = function (LIB) {
    var ccjson = this;

    const CONTEXTS = require("../../../../lib/logic.cores/0-server.boot").boot(LIB);

    const NEDB = require("nedb");
    
    
    var instances = {};
    // We ensure we only have one DB connection if same file
    // is opened multiple times for different stacks.
    function getNEDBInstance (config) {
        if (instances[config.filename]) {
            return instances[config.filename];
        }
        return (instances[config.filename] = new NEDB(config));
    }
    

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);

                var context = config.context();

                var tables = {};

                var api = {
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
                
                context.setAdapterAPI(api);


                function loadTableStores () {
                    if (!config.collectionsPath) {
                        return LIB.Promise.resolve();
                    }
                    return context.adapters["data.mapper"].loadCollectionModelsForPath(config.collectionsPath).then(function (models) {
                        return LIB.Promise.all(Object.keys(models).map(function (name) {

                            tables[name] = getNEDBInstance(LIB._.assign(LIB._.cloneDeep(config.nedb), {
                                filename: config.nedb.filename + "." + name
                            }));
                        }));
                    });
                }


                function seedCollections () {
                    if (!config.collectionsPath) {
                        return LIB.Promise.resolve();
                    }
                    return context.adapters["data.mapper"].loadCollectionSeedsForPath(config.collectionsPath).then(function (seeds) {
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
                    return seedCollections();
                }).catch(function (err) {
                    console.error("ERROR while starting NEDB:", err.stack);
                });
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
