var gulp = require("gulp");
var babel = require("gulp-babel");
// var plumber = require("gulp-plumber");

var SOURCES = ["lib/*.js"];
var DEST_DIR = "lib-gen";

gulp.task("babelify", function(){
    gulp.src(SOURCES)
    // Use plumber to handle errors without terminating the pipe-chain
    .pipe(babel({
        presets: ["es2015"]
    }))
    .pipe(gulp.dest(DEST_DIR));
});

gulp.task("default", ["babelify"]);
