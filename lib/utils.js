"use strict"

const utils = {
    promisifyFs(func, shouldFailSilently=false) {
        return function(...args){
            return new Promise((resolve, reject) => {
                const onDone = (error, result) => {
                    if(error && shouldFailSilently){
                        resolve(error);
                    } else {
                        error ? reject(error) : resolve(result);
                    }
                };
                args.push(onDone);
                func(...args);
            });
        };
    },
    collectUberStats(promises, uberResult, onDone, onError) {
        Promise.all(promises).then((allRes) => {
            uberResult = allRes.reduce((res, current) => {
                if(utils.isError(current)){
                    uberResult.errors.push(current);
                } else if(current) {
                    Object.keys(res).forEach((attr) => {
                        res[attr] = res[attr].concat(current[attr]);
                    });
                }
                return res;
            }, uberResult);

            onDone(uberResult);
        })
        .catch(onError);
    },
    decorateSymlinkStatsObject: (readlinkPath) => {
        return silentPromisifiedLstat(readlinkPath).then((symlinkStats) => {
            if(symlinkStats){
                symlinkStats.targetPath = readlinkPath;
            }
            Object.assign(symlinkStats, {isBrokenLink: () => !!utils.isError(symlinkStats)});
            return symlinkStats;
        });
    },
    isError: (obj) => obj instanceof Error,
    isIgnored: (options, stats) => {
        let ingored = false;
        if(options){
            const keys = Object.keys(options);
            ingored = keys.reduce((answer, key) => {
                if(options[key] && stats[key]){
                    answer = options[key](stats[key]) || answer;
                }
                return answer;
            }, false);
        }
        return ingored;
    },
    getTargetToSymlinkStats: (linkStats, targetStats) => {
        const path = linkStats.parentLink || linkStats.path;
        const stats = Object.assign({}, targetStats, {
            path,
            isSymbolicLink: () => true,
        });
        return stats;
    },
};

const fs = require("fs");
const silentPromisifiedLstat = utils.promisifyFs(fs.lstat, true);

module.exports = utils;
