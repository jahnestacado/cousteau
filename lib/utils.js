"use strict"

const utils = {
    promisifyFs(func, shouldFailSilently=false) {
        return function(...args){
            return new Promise((resolve, reject) => {
                const onDone = (error, result) => {
                    if(error && shouldFailSilently){
                        resolve(error)
                    } else {
                        error ? reject(error) : resolve(result);
                    }
                };
                args.push(onDone);
                func(...args);
            });
        };
    },
    collectUberStats(promises, uberStats, onDone, onError) {
        Promise.all(promises).then((allRes) => {
            uberStats = allRes.reduce((res, current) => {
                Object.keys(res).forEach((attr) => {
                    res[attr] = res[attr].concat(current[attr]);
                });
                return res;
            }, uberStats);

            onDone(uberStats);
        })
        .catch(onError);
    },
    decorateStatsWithIsBrokenLink: (stats) => Object.assign(stats, {isBrokenLink: () => !!utils.isError(stats)}),
    isError: (obj) => obj instanceof Error,
    isIgnored: (options, stats) => {
        let ingored = false;
        if(options){
            const keys = Object.keys(options);
            ingored = keys.reduce((answer, key) => {
                answer = options[key](stats[key]) && answer;
                return answer;
            }, true);
        }
        return ingored;
    },
    isSymlinkIgnored: (options, targetStats, symlinkPath) => {
        // We do this in order to ignore all stats of symlink while applying filtering apart from its path 
        return utils.isIgnored(options, {path: symlinkPath}) || utils.isIgnored(options, targetStats);
    },
};

module.exports = utils;
