/**
* cousteau <https://github.com/jahnestacado/cousteau>
* Copyright (c) 2017 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
"use strict"

const {
    promisifyFs,
    collectResults,
    mergeTargetStats,
    isError,
    isIgnored,
    isSymlinkIgnored,
} = require("./utils");
const fs = require("fs");
const Path = require("path");
const readdir = promisifyFs(fs.readdir);
const silentPromisifiedLstat = promisifyFs(fs.lstat, true);
const silentPromisifiedReadlink = promisifyFs(fs.readlink, true);
const silentPromisifiedCousteau = promisifyFs(find, true);

function find(...args) {
    const {targetPath, filterOptions, onDone} = handleArgs(args);
    const resolvedTargetPath = Path.resolve(targetPath);
    const findResult = {
        files: [],
        dirs: [],
        brokenSymlinks: [],
        errors: [],
    };
    readdir(resolvedTargetPath).then((result) => {
        const symlinkUberStats = [];
        const fullpaths = []
        const lstatPromises = result.map((item, i) => {
            fullpaths.push(Path.join(resolvedTargetPath, item));
            return silentPromisifiedLstat(fullpaths[i]);
        });

        const cousteauPromises = [];
        Promise.all(lstatPromises).then((allStats) => {
            allStats.forEach((stats, i) => {
                if(!isError(stats)){
                    const path = fullpaths[i];
                    const cousteauStats = Object.assign(stats, {path});
                    if(stats.isFile()){
                        !isIgnored(filterOptions.file, cousteauStats) && findResult.files.push(cousteauStats);
                    } else if(stats.isDirectory()) {
                        if(!isIgnored(filterOptions.dir, cousteauStats)){
                            findResult.dirs.push(cousteauStats);
                            cousteauPromises.push(silentPromisifiedCousteau(path, filterOptions));
                        }
                    } else if(stats.isSymbolicLink()) {
                        symlinkUberStats.push(cousteauStats);
                    } else {
                        console.warn(`Not a file/directory/symlink artifact: ${path}`);
                    }
                } else {
                    findResult.errors.push(stats);
                }
            });
            const onResult = (_findResult) => followAndRetrieveSymlinks(_findResult, symlinkUberStats, filterOptions, onDone);
            collectResults(cousteauPromises, findResult, onResult, onDone);
        });
    })
    .catch((error) => {
        findResult.errors.push(error);
        onDone(null, findResult);
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

function followAndRetrieveSymlinks(findResult, symlinkUberStats, filterOptions, onDone) {
    const symlinkStatsPromises = [];
    symlinkUberStats.forEach((linkStats) => {
        const {path} = linkStats;
        const symlinkPromise = silentPromisifiedReadlink(path)
                                .then((readlinkPath) => {
                                    if(!isError(readlinkPath) && Path.basename(path) !== readlinkPath) {
                                        const resolvedPath = Path.resolve(Path.dirname(path), readlinkPath);
                                        readlinkPath = Path.normalize(resolvedPath);
                                    }
                                    return readlinkPath;
                                })
                                .then(getSymlinkCousteauStats);
        symlinkStatsPromises.push(symlinkPromise);
    });

    Promise.all(symlinkStatsPromises).then((allTargetStats) => {
        const promises = [];
        symlinkUberStats.forEach((linkStats, i) => {
            const targetStats = allTargetStats[i];
            const mergedTargetStats = mergeTargetStats(linkStats, targetStats);
            if(targetStats.isBrokenLink()){
                findResult.brokenSymlinks.push(mergedTargetStats.path);
            } else if(targetStats.isSymbolicLink()){
                const followLinkedSymlinkPromise = getLinkedSymlinksRetrievalPromise({linkStats, targetStats, findResult, filterOptions});
                promises.push(followLinkedSymlinkPromise);
            } else if(targetStats.isFile() && !isIgnored(filterOptions.file, mergedTargetStats)){
                findResult.files.push(mergedTargetStats);
            } else if(targetStats.isDirectory() && !isIgnored(filterOptions.dir, mergedTargetStats)) {
                findResult.dirs.push(mergedTargetStats);
                promises.push(silentPromisifiedCousteau(mergedTargetStats.path, filterOptions));
            } else {
                console.warn(`Symlink points to a non file/directory/symlink artifact: ${linkStats.path}`);
            }
        });

        collectResults(promises, findResult, (_cousteauStats) => {
            onDone(null, _cousteauStats);
        }, onDone);
    })
    .catch(onDone);
}

function getSymlinkCousteauStats(readlinkPath) {
    return silentPromisifiedLstat(readlinkPath).then((symlinkStats) => {
        if(symlinkStats){
            symlinkStats.targetPath = readlinkPath;
        }
        Object.assign(symlinkStats, {isBrokenLink: () => !!isError(symlinkStats)});
        return symlinkStats;
    });
}

function getLinkedSymlinksRetrievalPromise({linkStats, targetStats, findResult, filterOptions}) {
    const promise = new Promise((resolve, reject) => {
        const parentLink = linkStats.parentLink || linkStats.path;
        const symlinkToSymlinkStats = [Object.assign({}, targetStats, {path: targetStats.targetPath, parentLink})];
        followAndRetrieveSymlinks(findResult, symlinkToSymlinkStats, filterOptions, (error, result) => {
            // We don't want to store the returned result so we resolve with null
            error ? reject(error) : resolve(null);
        });
    });
    return promise;
}

function cousteau(...args) {
    const onDone = args.pop();
    silentPromisifiedCousteau(...args).then((result) => {
        const {errors} = result;
        delete result.errors;
        onDone(errors, result);
    });
};

module.exports = cousteau;
