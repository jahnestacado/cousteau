"use strict"
const utils = {
    promisifyFs(func, isSilent=false) {
        return function(path){
            return new Promise((resolve, reject) => {
                func(path, (error, result) => {
                    if(error && isSilent){
                        resolve(error)
                    } else {
                        error ? reject(error) : resolve(result);
                    }
                });
            });
        };
    },
    collect(promises, paths, onDone, onError) {
        Promise.all(promises).then((allRes) => {
            paths = allRes.reduce((res, current) => {
                Object.keys(res).forEach((attr) => {
                    res[attr] = res[attr].concat(current[attr]);
                });
                return res;
            }, paths);

            onDone(paths);
        })
        .catch(onError);
    },
    isBrokenLink: (stat) => stat instanceof Error ? null : stat,
};

module.exports = utils;
