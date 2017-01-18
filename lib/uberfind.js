"use strict"

const {
    promisifyFs,
    collectUberStats,
    decorateStatWithIsBrokenLink,
    isError,
} = require("./utils");
const fs = require("fs");
const Path = require("path");
const readdir = promisifyFs(fs.readdir);
const lstat = promisifyFs(fs.lstat);
const silentLstat = promisifyFs(fs.lstat, true);
const silentReadlink = promisifyFs(fs.readlink, true);
const uberfind = promisifyFs(find);

function find(targetPath, onDone) {
    const resolvedTargetPath = Path.resolve(targetPath);
    const statPromises = [];
    readdir(resolvedTargetPath).then((result) => {
        const uberStats = {
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
                if(stats.isFile()){
                    uberStats.files.push(Object.assign(stats, {path}));
                } else if(stats.isDirectory()) {
                    uberStats.dirs.push(Object.assign(stats, {path}));
                    uberfindPromises.push(uberfind(path));
                } else if(stats.isSymbolicLink()) {
                    symlinkUberStats.push(Object.assign(stats, {path}));
                }
            });

            const onCollect = (_uberStats) => followAndRetrieveSymlinks(_uberStats, symlinkUberStats, onDone);
            collectUberStats(uberfindPromises, uberStats, onCollect, onDone);
        });
    })
    .catch(onDone);
}

function followAndRetrieveSymlinks(uberStats, symlinkUberStats, onDone) {
    const symlinkPromises = [];
    symlinkUberStats.forEach((linkStats) => {
        const {path} = linkStats;
        const symlinkPromise = silentReadlink(path).then((result) => {
                                    if(!isError(result) && Path.basename(path) !== result) {
                                        const resolvedPath = Path.resolve(Path.dirname(path), result);
                                        result = Path.normalize(resolvedPath);
                                    }
                                    return result;
                                })
                                .then(silentLstat)
                                .then(decorateStatWithIsBrokenLink);

        symlinkPromises.push(symlinkPromise);
    });

    Promise.all(symlinkPromises).then((symlinkStats) => {
        const promises = [];
        symlinkUberStats.forEach((linkStats, i) => {
            const stats = symlinkStats[i];
            if(stats.isBrokenLink()){
                uberStats.brokenSymlinks.push(linkStats.path);
            } else if(stats.isFile()){
                uberStats.files.push(linkStats);
            } else if(stats.isDirectory()) {
                uberStats.dirs.push(linkStats);
                promises.push(uberfind(linkStats.path));
            }
        });

        collectUberStats(promises, uberStats, (_uberStats) => {
            onDone(null, _uberStats);
        }, onDone);
    })
    .catch(onDone);
}

module.exports = uberfind;
