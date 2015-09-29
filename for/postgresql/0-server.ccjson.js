
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

//console.log("INIT POSTGRESQL");

/*

Install:

    brew install postgresql
    http://braumeister.org/formula/postgresql
    OR use
    a docker image

  * `cd /usr/local/Cellar/postgresql/9.4.4/bin`
  * Dump db: `./pg_dump -p PORT -h HOST -U USER DBNAME --clean --no-owner --no-privileges --no-tablespaces > dump.sql`
  * Restore: `./psql -p PORT -h HOST -U USER DBNAME < dump.sql`
*/

            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
