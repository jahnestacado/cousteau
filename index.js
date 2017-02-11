var majorNodeVersion = parseInt(process.version.match(/v(\d)+/)[1]);
if( majorNodeVersion < 6) {
    module.exports = require("./lib-gen/uberfind.js");
} else {
    module.exports = require("./lib/uberfind.js");
}
