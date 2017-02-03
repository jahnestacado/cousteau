"use strict"

const {
    promisifyFs,
    collectUberStats,
    decorateStatsWithIsBrokenLink,
    isError,
    isIgnored,
    isSymlinkIgnored,
} = require("./utils");
const fs = require("fs");
const Path = require("path");
const readdir = promisifyFs(fs.readdir);
const lstat = promisifyFs(fs.lstat);
const silentLstat = promisifyFs(fs.lstat, true);
const silentReadlink = promisifyFs(fs.readlink, true);
const uberfind = promisifyFs(find);

function find(...args) {
    const {targetPath, filterOptions, onDone} = handleArgs(args);
    const resolvedTargetPath = Path.resolve(targetPath);
    const statPromises = [];
    readdir(resolvedTargetPath).then((result) => {
        const resultStats = {
            files: [],
            dirs: [],
            brokenSymlinks: [],
        };

        const symlinkUberStats = [];
        const fullpaths = []
        result.forEach((item, i) => {
            fullpaths.push(Path.join(resolvedTargetPath, item));
            statPromises.push(lstat(fullpaths[i]));
        });

        const uberfindPromises = [];
        Promise.all(statPromises).then((allStats) => {
            allStats.forEach((stats, i) => {
                const path = fullpaths[i];
                const uStats = Object.assign(stats, {path});

                if(stats.isFile()){
                    !isIgnored(filterOptions.file, uStats) && resultStats.files.push(uStats);
                } else if(stats.isDirectory()) {
                    if(!isIgnored(filterOptions.dir, uStats)){
                        resultStats.dirs.push(uStats);
                        uberfindPromises.push(uberfind(path, filterOptions));
                    }
                } else if(stats.isSymbolicLink()) {
                    symlinkUberStats.push(uStats);
                } else {
                    console.warn(`Not a file/directory artifact: ${path}`);
                }
            });
            const onCollect = (_uberStats) => followAndRetrieveSymlinks(_uberStats, symlinkUberStats, filterOptions, onDone);
            collectUberStats(uberfindPromises, resultStats, onCollect, onDone);
        });
    })
    .catch(onDone);
}

function handleArgs(args){
    const targetPath = args[0];
    let filterOptions = {file: null, dir: null};
    let onDone = null;
    if(args.length === 2){
        onDone = args[1]
    } else {
        filterOptions = args[1];
        onDone = args[2];
    }
    return {targetPath, filterOptions, onDone};
}

function followAndRetrieveSymlinks(resultStats, symlinkUberStats, filterOptions, onDone) {
    const symlinkPromises = [];
    symlinkUberStats.forEach((linkStats) => {
        const {path} = linkStats;
        const symlinkPromise = silentReadlink(path)
                                .then((result) => {
                                    if(!isError(result) && Path.basename(path) !== result) {
                                        const resolvedPath = Path.resolve(Path.dirname(path), result);
                                        result = Path.normalize(resolvedPath);
                                    }
                                    return result;
                                })
                                .then(silentLstat)
                                .then(decorateStatsWithIsBrokenLink);

        symlinkPromises.push(symlinkPromise);
    });

    Promise.all(symlinkPromises).then((symlinkStats) => {
        const promises = [];
        symlinkUberStats.forEach((linkStats, i) => {
            const stats = symlinkStats[i];
            if(stats.isBrokenLink()){
                resultStats.brokenSymlinks.push(linkStats.path);
            } else if(stats.isFile() && !isSymlinkIgnored(filterOptions.file, stats, linkStats.path)){
                resultStats.files.push(linkStats);
            } else if(stats.isDirectory() && !isSymlinkIgnored(filterOptions.dir, stats, linkStats.path)) {
                resultStats.dirs.push(linkStats);
                promises.push(uberfind(linkStats.path, filterOptions));
            }
        });

        collectUberStats(promises, resultStats, (_uberStats) => {
            onDone(null, _uberStats);
        }, onDone);
    })
    .catch(onDone);
}

module.exports = uberfind;
