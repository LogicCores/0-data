
exports.forLib = function (LIB) {
    var ccjson = this;

    const Q = require("q");
    const KNEX = require("knex");

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);

                var context = config.context();

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
                	var knex = KNEX(config.knex);

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
                        }
                    });
                }

            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
