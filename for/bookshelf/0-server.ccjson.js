
exports.forLib = function (LIB) {
    var ccjson = this;

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

                // @see http://blog.ragingflame.co.za/2014/12/16/building-a-simple-api-with-express-and-bookshelfjs

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
                            } else
                            if (
                                record[name] &&
                                Array.isArray(record[name]) &&
                                api.models[name]
                            ) {
                                record[name] = record[name].map(function (record) {
                                    addRecord(name, record);
                                    return record.id;
                                });
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
                    !api.adapter ||
                    !api.adapter.bookshelf
                ) {
                    return self;
                }

                return config.collections().then(function (models) {
                    
                    var foreignFields = {};

                    return LIB.Promise.all(Object.keys(models).map(function (modelName) {
                        Object.keys(models[modelName].Record["@fields"]).forEach(function (fieldName) {
                            var field = models[modelName].Record["@fields"][fieldName];
                            if (field.linksToOne) {
                                if (!foreignFields[modelName]) {
                                    foreignFields[modelName] = {};
                                }
                                foreignFields[modelName][field.linksToOne] = function () {
                                    return this.belongsTo(
                                        api.models[field.linksToOne],
                                        fieldName
                                    );
                                }
                                if (!foreignFields[field.linksToOne]) {
                                    foreignFields[field.linksToOne] = {};
                                }
//console.log("TABLE ", field.linksToOne, "HAS MANY OF", modelName, "based on FIELD", fieldName, 'in relation', modelName, 'for collection', field.linksToOne);                          
                                foreignFields[field.linksToOne][modelName] = function () {
                                    return this.hasMany(
                                        api.models[modelName],
                                        fieldName
                                    );
                                }
                            }
                        });
                    })).then(function () {
                        Object.keys(foreignFields).forEach(function (modelName) {

                            // Create bookshelf models
                            api.models[modelName] = api.adapter.bookshelf.Model.extend(
                                LIB._.assign(foreignFields[modelName], {
                                    tableName: modelName
                                })
                            );
//console.log("model name", modelName);                            
                            api.models[modelName]["@fields"] = models[modelName].Record["@fields"];
                        });
                    });

                }).then(function () {
                    return self;
                });
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
