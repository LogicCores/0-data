
exports.forLib = function (LIB) {

    var exports = {};

    exports.spin = function (context) {

        var exports = {};

//console.log("spin wildfire server app");

/*
var subscription = context.adapters["data.wildfire"].subscribe({
    // TODO: Subscribe to various records and values in nested static JSON fashion which
    //       will be used to setup a sync get sequence and an async fetch sequence.
});
*/

        return exports;
    }

    return exports;
}


/*
                // The adapter that is called when a collection is called and data needs to be fetched.
                function setCollectionsAdapter () {
                    if (config.useAsCollectionsAdapter !== true) {
                        console.log("Skip setCollectionsAdapter due to config option 'useAsCollectionsAdapter !== true'");
                        return LIB.Promise.resolve();
                    }

                    return config.collections().then(function (models) {
                        return LIB.Promise.all(Object.keys(models).map(function (name) {

                            var model = models[name];

                            // TODO: Act on all kinds of adapter options like caching etc...
                            //       For now all queries are executed when called and results not cached.
                            model.setDefaultAdapter({
                                getAsync: function (id) {
                					return api.adapter.knex(model.name, function (table) {
                						return table.where("id", id);
                					}).then(function (result) {
                					    if (result.length === 0) {
                					        return null;
                					    }
                					    return new model.Record(result[0]);
                					});
                                },
                                whereAsync: function (query) {

console.log("CALL WHERE in ADAPTER!!!!", query);

                                }
                            });
                        }));
                    });
                }
*/
