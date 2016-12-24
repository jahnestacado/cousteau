"use strict"
const {
    promisifyFs,
    collect,
    decorateStatWithIsBrokenLink,
    isError,
} = require("./utils");
const fs = require("fs");
const path = require("path");
const readdir = promisifyFs(fs.readdir);
const lstat = promisifyFs(fs.lstat);
const silentStat = promisifyFs(fs.lstat, true);
const silentReadlink = promisifyFs(fs.readlink, true);
const uberfind = promisifyFs(find);

function find(targetPath, onDone) {
    const resolvedTargetPath = path.resolve(targetPath);
    const statPromises = [];
    readdir(resolvedTargetPath).then((result) => {
        const paths = {
            files: [],
            dirs: [],
            symlinks: [],
            brokenSymlinks: [],
        };
        const fullpaths = []
        result.forEach((item, i) => {
            fullpaths.push(path.join(resolvedTargetPath, item));
            statPromises.push(lstat(fullpaths[i]));
        });

        const uberfindPromises = [];
        Promise.all(statPromises).then((allStats) => {
            allStats.forEach((stats, i) => {
                const itempath = fullpaths[i];
                if(stats.isFile()){
                    paths.files.push(itempath);
                } else if(stats.isDirectory()) {
                    paths.dirs.push(itempath);
                    uberfindPromises.push(uberfind(itempath));
                } else if(stats.isSymbolicLink()) {
                    paths.symlinks.push(itempath);
                }
            });

            collect(uberfindPromises, paths,(resPaths) => retrieveSymlinks(resPaths, onDone), onDone);
        });
    })
    .catch(onDone);
}

function retrieveSymlinks(levelResult, onDone) {
    const symlinkPromises = [];
    levelResult.symlinks.forEach((link) => {
        const symlinkPromise = silentReadlink(link).then((result) => {
                                    if(!isError(result) && path.basename(link) !== result) {
                                        const resolvedPath = path.resolve(path.dirname(link), result);
                                        result = path.normalize(resolvedPath);
                                    }
                                    return result;
                                })
                                .then(silentStat)
                                .then(decorateStatWithIsBrokenLink);
        symlinkPromises.push(symlinkPromise);
    });

    Promise.all(symlinkPromises).then((symlinkStats) => {
        const promises = [];
        levelResult.symlinks.forEach((linkpath, i) => {
            if(symlinkStats[i].isBrokenLink()){
                levelResult.brokenSymlinks.push(linkpath);
            } else if(symlinkStats[i].isFile()){
                levelResult.files.push(linkpath);
            } else if(symlinkStats[i].isDirectory()) {
                levelResult.dirs.push(linkpath);
                promises.push(uberfind(linkpath));
            }
        });

        collect(promises, levelResult, (paths) => onDone(null, paths), onDone);
    })
    .catch(onDone);
}

module.exports = uberfind;
