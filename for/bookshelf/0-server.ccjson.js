
exports.forLib = function (LIB) {
    var ccjson = this;

    const CONTEXTS = require("../../../../lib/logic.cores/0-server.boot").boot(LIB);
    const BOOKSHELF = require("bookshelf");

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);

//console.log("config", config);

                var knex = config.knex();

                var context = config.context();

                var api = {
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
                                api.models[ownCollection]["@fields"][name] &&
                                api.models[ownCollection]["@fields"][name].linksToOne
                            ) {
                              addRecord(api.models[ownCollection]["@fields"][name].linksToOne, record[name]);
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
                    api.adapter.bookshelf = BOOKSHELF(knex);
                }

                context.setAdapterAPI(api);
                

                if (
                    !config.collectionsPath ||
                    !api.adapter ||
                    !api.adapter.bookshelf
                ) {
                    return self;
                }

                return context.getAdapterAPI("data.knexjs.mapper").then(function (mapperApi) {
                    var models = mapperApi.models;

                    return LIB.Promise.all(Object.keys(models).map(function (modelName) {

                        var foreignFields = {};
                        Object.keys(models[modelName].Record["@fields"]).forEach(function (fieldName) {
                            var field = models[modelName].Record["@fields"][fieldName];

                            if (field.linksToOne) {
                                foreignFields[fieldName] = function () {
                                    return this.belongsTo(
                                        api.models[field.linksToOne],
                                        fieldName
                                    );
                                }
                            }
                        });

                        api.models[modelName] = api.adapter.bookshelf.Model.extend(
                            LIB._.assign(foreignFields, {
                                tableName: modelName
                            })
                        );
                        api.models[modelName]["@fields"] = models[modelName].Record["@fields"]
                    }));

                }).then(function () {
                    return self;
                });
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
