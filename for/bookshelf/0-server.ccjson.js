
exports.forLib = function (LIB) {
    var ccjson = this;

    const CONTEXTS = require("../../../../lib/logic.cores/0-server.boot").boot(LIB);
    const BOOKSHELF = require("bookshelf");

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

//console.log("config", config);

                    var knex = config.knex();

                    var context = {
                        adapter: {},
                        models: {},
                        helpers: {
                          collateRecords: function (ownCollection, records) {
                            var collections = {};
                            var collectionsById = {};
                            function addRecord(collection, record) {
                              if (!collections[collection]) {
                                collections[collection] = [];
                                collectionsById[collection] = {};
                              }
                              if (collectionsById[collection][record.id]) {
                                  return;
                              }
                              collectionsById[collection][record.id] = record;
                              collections[collection].push(record);
                            }
                            records.forEach(function (record) {
                              for (var name in record) {
                                if (
                                    record[name] &&
                                    typeof record[name] !== "string" &&
                                    typeof record[name] === "object" &&
                                    typeof record[name].id !== "undefined" &&
                                    context.models[ownCollection]["@fields"][name] &&
                                    context.models[ownCollection]["@fields"][name].linksToOne
                                ) {
                                  addRecord(context.models[ownCollection]["@fields"][name].linksToOne, record[name]);
                                  record[name] = record[name].id;
                                }
                              }
                              addRecord(ownCollection, record);
                            });
                            return collections;
                          }                            
                        }
                    };

                    // TODO: See why we get instance requests without knex set
                    if (knex) {
                        context.adapter.bookshelf = BOOKSHELF(knex);
                    }

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

                    function buildModels () {
                        if (
                            !config.collectionsPath ||
                            !context.adapter ||
                            !context.adapter.bookshelf
                        ) {
                            return LIB.Promise.resolve();
                        }
                        return contexts.adapters.data.mapper.loadCollectionModelsForPath(config.collectionsPath).then(function (models) {

                            return LIB.Promise.all(Object.keys(models).map(function (modelName) {

                                var foreignFields = {};
                                Object.keys(models[modelName].Record["@fields"]).forEach(function (fieldName) {
                                    var field = models[modelName].Record["@fields"][fieldName];

                                    if (field.linksToOne) {
                                        foreignFields[fieldName] = function () {
                                            return this.belongsTo(
                                                context.models[field.linksToOne],
                                                fieldName
                                            );
                                        }
                                    }
                                });

                                context.models[modelName] = context.adapter.bookshelf.Model.extend(
                                    LIB._.assign(foreignFields, {
                                        tableName: modelName
                                    })
                                );
                                context.models[modelName]["@fields"] = models[modelName].Record["@fields"]
                            }));

                        });
                    }


                    return buildModels().then(function () {

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
                }

            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
