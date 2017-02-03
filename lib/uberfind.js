"use strict"

const {
    promisifyFs,
    collectUberStats,
    decorateSymlinkStatsObject,
    transformStatsIfLinkedSymlink,
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
            allStats.forEach((targetStats, i) => {
                const path = fullpaths[i];
                const uStats = Object.assign(targetStats, {path});

                if(targetStats.isFile()){
                    !isIgnored(filterOptions.file, uStats) && resultStats.files.push(uStats);
                } else if(targetStats.isDirectory()) {
                    if(!isIgnored(filterOptions.dir, uStats)){
                        resultStats.dirs.push(uStats);
                        uberfindPromises.push(uberfind(path, filterOptions));
                    }
                } else if(targetStats.isSymbolicLink()) {
                    symlinkUberStats.push(uStats);
                } else {
                    console.warn(`Not a file/directory/symlink artifact: ${path}`);
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
                                .then(decorateSymlinkStatsObject);
        symlinkPromises.push(symlinkPromise);
    });

    Promise.all(symlinkPromises).then((symlinkStats) => {
        const promises = [];
        symlinkUberStats.forEach((linkStats, i) => {
            const targetStats = symlinkStats[i];
            if(targetStats.isBrokenLink()){
                transformStatsIfLinkedSymlink(linkStats);
                resultStats.brokenSymlinks.push(linkStats.path);
            } else if(targetStats.isSymbolicLink()){
                const followLinkedSymlinkPromise = getLinkedSymlinksRetrievalPromise({linkStats, targetStats, resultStats, filterOptions});
                promises.push(followLinkedSymlinkPromise);
            } else if(targetStats.isFile() && !isSymlinkIgnored(filterOptions.file, targetStats, linkStats.path)){
                transformStatsIfLinkedSymlink(linkStats);
                resultStats.files.push(linkStats);
            } else if(targetStats.isDirectory() && !isSymlinkIgnored(filterOptions.dir, targetStats, linkStats.path)) {
                transformStatsIfLinkedSymlink(linkStats);
                resultStats.dirs.push(linkStats);
                promises.push(uberfind(linkStats.path, filterOptions));
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
        const symlinkToSymlinkStats = [Object.assign({}, targetStats, {path: targetStats.readlink, parentLink})];
        followAndRetrieveSymlinks(resultStats, symlinkToSymlinkStats, filterOptions, (error, res) => {
            if(error){
                reject(error);
            } else {
                resolve(null);
            }
        });
    });
    return promise;
}

module.exports = uberfind;
