
exports.forLib = function (LIB) {
    var ccjson = this;

    const Q = require("q");
    const KNEX = require("knex");

    var globalTables = {};
    var globalSeeds = {};

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);

                var context = config.context();

                var knex = null;

                var api = {};

                // TODO: See why we get instance requests without sufficnet config set.
                //       Some calls are ok, but maybe too many? This should probably move up
                //       one layer to the entity instance.
                if (
                    config.knex &&
                    config.knex.connection &&
                    config.knex.connection.host
                ) {
                	// @see http://knexjs.org/#Installation-node
                	console.log("KNEXJS Database: " + config.knex.connection.database);
                	knex = KNEX(config.knex);

                    api.adapter = {
                        knex: function (tableName, query) {
                    		if (typeof query === "undefined" && typeof tableName === "function") {
                    			query = tableName;
                    			tableName = null;
                    		}
                			var table = ((tableName) ? knex(tableName) : knex);
                			return query(table).then(function (resp) {
                
//console.log("RESPONSE:", resp);
                
                				return resp;
                			}).catch(function (err) {
                    			console.error("DB Error:", err.stack);
                    			throw err;
                    		});
                    	},
                    	qknex: function (tableName, query) {
                    		if (typeof query === "undefined" && typeof tableName === "function") {
                    			query = tableName;
                    			tableName = null;
                    		}
                    		return Q.fcall(function () {
                    			var table = ((tableName) ? knex(tableName) : knex);
                    			return query(table).then(function (resp) {
                    
//console.log("RESPONSE:", resp);
                    
                    				return resp;
                    			});
                    		}).catch(function (err) {
                    			console.error(err.stack);
                    			throw err;
                    		});
                    	}
                    };
                }
                
                context.setAdapterAPI(api);

                self.AspectInstance = function (aspectConfig) {

                    return LIB.Promise.resolve({
                        connection: function () {
                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(
                                    function () {
                                        return knex;
                                    }
                                )
                            );
                        },
                        getWildfireAdapter: function () {
                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(
                                    function () {

//console.log("TODO: GET WILDFIRE ADPATER!!!");                                        

                                    }
                                )
                            );
                        }
                    });
                }

                function ensureSchema () {
                    if (!knex) return LIB.Promise.resolve();

                    if (!config.ensureSchema) {
                        console.log("Skip ensure DB schema due to config option 'ensureSchema === false'");
                        return LIB.Promise.resolve();
                    }

                    return config.collections().then(function (models) {

                        // @see http://dataprotocols.org/json-table-schema/
                		// @docs http://knexjs.org/#Schema

                		function getExistingTables () {
                			return knex.raw("SELECT * FROM pg_catalog.pg_tables WHERE schemaname = 'public'").then(function(resp) {
                				var rows = {};
                				resp.rows.forEach(function (row) {
                					rows[row.tablename] = true;
                				});
                				return rows;
                			});
                		}

                		return getExistingTables().then(function (existingTables) {

                			function ensureTable (tableName, schema) {
                				if (existingTables[tableName]) return Q.resolve();
                				//return knex.schema.dropTable(tableName).then(function () {
                					console.log("[db] Create table: " + tableName);
                					return knex.schema.createTable(tableName, function (table) {
                				});
                				//});
                			}
                
                			function getExistingFields (tableName) {
                				return knex.raw("select * from INFORMATION_SCHEMA.COLUMNS where table_name = '" + tableName + "'").then(function (resp) {
                					var rows = {};
                					resp.rows.forEach(function (row) {
                						rows[row.column_name] = row;
                					});
                					return rows;
                				});
                			}
                
                			function ensureFields (tableName, schema) {
                				return getExistingFields(tableName).then(function (existingFields) {
                
                					var currentFields = {};

                                    // POLICY: We only ADD fields and augment them with new contratints.
                                    //         If a field is removed we do not remove it but rather ensure
                                    //         it is not required any more.

                                    // TODO: Don't touch table if no fields have changed. i.e. diff schemas
                                    //       before running this here.
                					return knex.schema.table(tableName, function (table) {

                						// Add new fields.
                						Object.keys(schema.fields).forEach(function (name) {
                						    var field = schema.fields[name];

                                            // We do not provision derived fields.
                						    if (field.derived) return;

                							currentFields[name] = true;
                
                							if (existingFields[name]) {
                
                								// Remove constraints if no longer in schema or constraint removed
                								if (
                									schema.primaryKey !== name &&
                									(!field.constraints || field.constraints.required !== true) &&
                									existingFields[name].is_nullable === 'NO'
                								) {
                									console.log("[db] Drop 'required' from field '" + name + "' for table '" + tableName + "' (due to required removed)");

                									knex.raw('ALTER TABLE "' + tableName + '" ALTER COLUMN "' + name + '" DROP NOT NULL;').catch(function (err) {
                										console.error("SQL Error:", err.stack);
                									});
                								}
                								return;
                							}
                
                							// TODO: Modify column on change.
                
                							console.log("[db] Create field: " + name);
                
                							var fieldDef = null;
                
                							// Field type
                							if (field.constraints && field.constraints.autoincrement === true) {
                								fieldDef = table.increments(name);
                							} else
                							// TODO: implement other field types.
                							if (field.type === "timestamp") {
                								fieldDef = table.timestamp(name);
                							} else
                							if (field.type === "boolean") {
                								fieldDef = table.boolean(name);
                							} else
                							if (field.type === "string" || !field.type) {
                								fieldDef = table.text(name);
                							}
                
                							// Field extras
                							if (field.constraints) {
                								if (field.constraints.required === true) {
                									fieldDef = fieldDef.notNullable();
                								}
                								if (field.constraints.unique === true) {
                									fieldDef = fieldDef.unique();
                								}
                							}
                
                							if (typeof field.default !== "undefined") {
                								if (field.default === "Date.now()") {
                									fieldDef = fieldDef.defaultTo(knex.raw('now()'));
                								} else {
                									fieldDef = fieldDef.defaultTo(field.default);
                								}
                							} else
                							if (
                								(field.type === "string" || !field.type) &&
                								(field.constraints && field.constraints.required === true)
                							) {
                								fieldDef = fieldDef.defaultTo("");
                							}
                
                						});
                					}).then(function () {
                
                						// Drop 'required' constraint on old fields to ensure we
                						// can insert new records while ignoring old fields.
                						return Q.all(Object.keys(existingFields).map(function (name) {
                							if (
                							    currentFields[name] ||
                							    existingFields[name].is_nullable === 'YES'
                							) return Q.resolve();

        									console.log("[db] Drop 'required' from field '" + name + "' for table '" + tableName + "' (due to field deleted)");

                							return knex.raw('ALTER TABLE "' + tableName + '" ALTER COLUMN "' + name + '" DROP NOT NULL;').catch(function (err) {
                								console.error("SQL Error:", err.stack);
                							});
                						}));
                					});
                				});
                			}

                            return LIB.Promise.all(Object.keys(models).map(function (name) {

                                // We init only once for all stacks
                                if (globalTables[name]) return;
                                globalTables[name] = true;

                                var model = models[name];
                                var schema = {
                				    // TODO: Make configurable
                				    primaryKey: "id",
                				    fields: models[name].Record["@fields"]
                				};
                				return ensureTable(name, schema).then(function () {
                					return ensureFields(name, schema);
                				});
                    		}));

                        });
                    });
                }

                function seedCollections () {
                    if (!knex) return LIB.Promise.resolve();

                    if (!config.seedCollections) {
                        console.log("Skip seeding collections due to config option 'seedCollections === false'");
                        return LIB.Promise.resolve();
                    }

                    return config.seeds().then(function (seeds) {
                        return LIB.Promise.all(Object.keys(seeds).map(function (name) {
                            if (!globalTables[name]) return;

                            // We init only once for all stacks
                            if (globalSeeds[name]) return;
                            globalSeeds[name] = true;

                            var collectionSeedInstance = seeds[name];

console.log(config.$alias, "TODO: KNEXJS SEED TABLE", name);


/*
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
*/
                        }));
                    });
                }

                return ensureSchema().then(function () {
                    return seedCollections();
                }).catch(function (err) {
                    console.error("ERROR while starting KNEXJS:", err.stack);
                    throw err;
                }).then(function () {
                    return self;
                });
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
