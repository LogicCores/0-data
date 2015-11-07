

exports.forLib = function (LIB) {

    var exports = {};

    exports.spin = function (context) {

        
        function initLocalStorage () {
        
        	// Ensure local storage is there and hook it up to a backend if not.
        
            try {
                return "localStorage" in window && window.localStorage != null;
            } catch (e) {
        
        		// TODO: Hook up to backend (via session id) if no local storage supported.
        
                var data = {},
                    undef;
                window.localStorage = {
                    setItem     : function(id, val) { return data[id] = String(val); },
                    getItem     : function(id) { return data.hasOwnProperty(id) ? data[id] : undef; },
                    removeItem  : function(id) { return delete data[id]; },
                    clear       : function() { return data = {}; }
                };
            }
        }
        
        initLocalStorage();


        return {
            setForGroup: function (group, name, value) {
                // TODO: Police expiry.
            	window.localStorage.setItem(group + "." + name, value);
            },
            getForGroup : function (group, name) {
            	return window.localStorage.getItem(group + "." + name) || null;
            }
        };
    }

    return exports;
}
