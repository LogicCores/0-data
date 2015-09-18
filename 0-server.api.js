
exports.forLib = function (LIB) {

    var exports = require("./0-common.api").forLib(LIB);

    // TODO: Load adapters as needed on demand
    exports.adapters["ccjson.record.mapper"] = require("./for/ccjson.record.mapper/0-server.api").forLib(LIB);

    return exports;
}
