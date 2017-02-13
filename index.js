/**
* cousteau <https://github.com/jahnestacado/cousteau>
* Copyright (c) 2017 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var majorNodeVersion = parseInt(process.version.match(/v(\d)+/)[1]);
if( majorNodeVersion < 6) {
    module.exports = require("./lib-gen/cousteau.js");
} else {
    module.exports = require("./lib/cousteau.js");
}
