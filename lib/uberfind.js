"use strict"

const {
    promisifyFs,
    collectUberStats,
    decorateSymlinkStatsObject,
    getTargetToSymlinkStats,
    isError,
    isIgnored,
    isSymlinkIgnored,
} = require("./utils");
const fs = require("fs");
const Path = require("path");
const readdir = promisifyFs(fs.readdir);
const silentPromisifiedLstat = promisifyFs(fs.lstat, true);
const silentPromisifiedReadlink = promisifyFs(fs.readlink, true);
const silentPromisifiedUberFind = promisifyFs(find, true);

function find(...args) {
    const {targetPath, filterOptions, onDone} = handleArgs(args);
    const resolvedTargetPath = Path.resolve(targetPath);
    const statPromises = [];
    const resultStats = {
        files: [],
        dirs: [],
        brokenSymlinks: [],
        errors: [],
    };
    readdir(resolvedTargetPath).then((result) => {
        const symlinkUberStats = [];
        const fullpaths = []
        result.forEach((item, i) => {
            fullpaths.push(Path.join(resolvedTargetPath, item));
            statPromises.push(silentPromisifiedLstat(fullpaths[i]));
        });

        const uberfindPromises = [];
        Promise.all(statPromises).then((allStats) => {
            allStats.forEach((targetStats, i) => {
                if(!isError(targetStats)){
                    const path = fullpaths[i];
                    const uStats = Object.assign(targetStats, {path});
                    if(targetStats.isFile()){
                        !isIgnored(filterOptions.file, uStats) && resultStats.files.push(uStats);
                    } else if(targetStats.isDirectory()) {
                        if(!isIgnored(filterOptions.dir, uStats)){
                            resultStats.dirs.push(uStats);
                            uberfindPromises.push(silentPromisifiedUberFind(path, filterOptions));
                        }
                    } else if(targetStats.isSymbolicLink()) {
                        symlinkUberStats.push(uStats);
                    } else {
                        console.warn(`Not a file/directory/symlink artifact: ${path}`);
                    }
                } else {
                    resultStats.errors.push(targetStats);
                }
            });
            const onCollect = (_uberStats) => followAndRetrieveSymlinks(_uberStats, symlinkUberStats, filterOptions, onDone);
            collectUberStats(uberfindPromises, resultStats, onCollect, onDone);
        });
    })
    .catch((error) => {
        resultStats.errors.push(error);
        onDone(null, resultStats)
    });
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
    const symlinkStatsPromises = [];
    symlinkUberStats.forEach((linkStats) => {
        const {path} = linkStats;
        const symlinkPromise = silentPromisifiedReadlink(path)
                                .then((result) => {
                                    if(!isError(result) && Path.basename(path) !== result) {
                                        const resolvedPath = Path.resolve(Path.dirname(path), result);
                                        result = Path.normalize(resolvedPath);
                                    }
                                    return result;
                                })
                                .then(decorateSymlinkStatsObject);
        symlinkStatsPromises.push(symlinkPromise);
    });

    Promise.all(symlinkStatsPromises).then((allTargetStats) => {
        const promises = [];
        symlinkUberStats.forEach((linkStats, i) => {
            const targetStats = allTargetStats[i];
            const mergedTargetStats = getTargetToSymlinkStats(linkStats, targetStats);

            if(targetStats.isBrokenLink()){
                resultStats.brokenSymlinks.push(mergedTargetStats.path);
            } else if(targetStats.isSymbolicLink()){
                const followLinkedSymlinkPromise = getLinkedSymlinksRetrievalPromise({linkStats, targetStats, resultStats, filterOptions});
                promises.push(followLinkedSymlinkPromise);
            } else if(targetStats.isFile() && !isIgnored(filterOptions.file, mergedTargetStats)){
                resultStats.files.push(mergedTargetStats);
            } else if(targetStats.isDirectory() && !isIgnored(filterOptions.dir, mergedTargetStats)) {
                resultStats.dirs.push(mergedTargetStats);
                promises.push(silentPromisifiedUberFind(mergedTargetStats.path, filterOptions));
            } else {
                console.warn(`Symlink points to a non file/directory/symlink artifact: ${linkStats.path}`);
            }
        });

        collectUberStats(promises, resultStats, (_uberStats) => {
            onDone(null, _uberStats);
        }, onDone);
    })
    .catch(onDone);
}

function getLinkedSymlinksRetrievalPromise({linkStats, targetStats, resultStats, filterOptions}){
    const promise = new Promise((resolve, reject) => {
        const parentLink = linkStats.parentLink || linkStats.path;
        const symlinkToSymlinkStats = [Object.assign({}, targetStats, {path: targetStats.targetPath, parentLink})];
        followAndRetrieveSymlinks(resultStats, symlinkToSymlinkStats, filterOptions, (error, result) => {
            // We don't want to store the returned result so we resolve with null
            error ? reject(error) : resolve(null);
        });
    });
    return promise;
}

const uberfind = (...args) => {
    const onDone = args.pop();
    silentPromisifiedUberFind(...args).then((result) => {
        const {errors} = result;
        delete result.errors;
        onDone(errors, result);
    })
};

module.exports = uberfind;
