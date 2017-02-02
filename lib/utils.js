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
        }
        return ingored;
    },
    isSymlinkIgnored: (options, stats, symlinkPath) => {
        const symlinkStats = Object.assign({}, stats, {path: symlinkPath});
        return utils.isIgnored(options, symlinkStats);
    },
};

module.exports = utils;
