"use strict"

const utils = {
    promisifyFs(func, shouldFailSilently=false) {
        return function(path){
            return new Promise((resolve, reject) => {
                func(path, (error, result) => {
                    if(error && shouldFailSilently){
                        resolve(error)
                    } else {
                        error ? reject(error) : resolve(result);
                    }
                });
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
    decorateStatWithIsBrokenLink: (stat) => Object.assign(stat, {isBrokenLink: () => !!utils.isError(stat)}),
    isError: (obj) => obj instanceof Error,
};

module.exports = utils;
