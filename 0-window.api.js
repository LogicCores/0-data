
exports.forLib = function (LIB) {
    
    var exports = require("./0-common.api").forLib(LIB);

    // TODO: Load adapters as needed on demand
    exports.adapters["ccjson.record.mapper"] = require("./for/ccjson.record.mapper/0-window.api").forLib(LIB);
    exports.adapters["localStorage"] = require("./for/localStorage/0-window.api").forLib(LIB);

    return exports;
}
