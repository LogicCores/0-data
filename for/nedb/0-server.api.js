
exports.spin = function (context) {
    
    const NEDB = require("nedb");

    return context.LIB.Promise.try(function () {

        var Datastore = function () {
            var self = this;
    
    
/*
ar Datastore = require('nedb')
  , db = new Datastore({ filename: 'path/to/datafile', autoload: true });
// You can issue commands right away

*/

console.log("NEW nedb CONFIG!!", context);

    
        }
    
        return new Datastore(context);
    });
}
