[![NPM version](http://img.shields.io/npm/v/cousteau.svg)](https://www.npmjs.org/package/cousteau)
[![Build Status](https://travis-ci.org/jahnestacado/cousteau.svg?branch=master)](https://travis-ci.org/jahnestacado/cousteau)
[![downloads per month](http://img.shields.io/npm/dm/cousteau.svg)](https://www.npmjs.org/package/cousteau)
[![Coverage Status](https://coveralls.io/repos/github/jahnestacado/cousteau/badge.svg?branch=master)](https://coveralls.io/github/jahnestacado/cousteau?branch=master)

# cousteau
-----------
Recursive directory walker that retrieves all sub-directory and file paths along with their [stats](https://nodejs.org/api/fs.html#fs_class_fs_stats).

## Features

* Recursively traverses each sub-directory
* Asynchronous
* Filtering support based on [CousteauStats](#CousteauStats) properties
* Symlink support (Filtering in symlinks is applied based on the original target file/directory)

## Install
```bash
$ npm install cousteau
```
## API
The function accepts three arguments

__cousteau(path, [ignoreOptions], callback)__

 * ```path``` - The target directory path
 * ```ingoreOptions``` - Optional filtering option
 * ```callback``` - The callback gets two arguments ```(errors, result)``` where result is an object with below structure


 ```javascript
    // Result object
    {
        dirs: [CousteauStats],
        files: [CousteauStats],
        brokenSymlinks: [String],
    }
```

#### CousteauStats<a name="CousteauStats"></a>

Is an [fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats) instance extended with the ```path``` property.

For example:
```javascript

    {
      path string
      dev number
      mode number
      nlink number
      uid number
      gid number
      rdev number
      blksize number
      ino number
      size number
      blocks number
      atime Date object
      mtime Date object
      ctime Date object
    }
```

The ```filterOption``` can be applied to one or more of the [CousteauStats](#CousteauStats) properties either on the directories and/or the files.

### Example
```javascript

const cousteau = require("cousteau");

// Without filtering
cousteau("aPath", (errors, result) => {
    console.log(errors, result);
});

// Find all directories that contain the "zilla" substring
// and all png files that their size is more than 1500 bytes

const filterOption = {
    dir: {
        path: (p) => !p.includes("zilla"),
    },
    file: {
        path: (p) => !(/.*\.png$/i).test(p),
        size: (s) => s <= 1500,
    },
};

cousteau("aPath", filterOption, (errors, result) => {
    console.log(errors, result);
});

```


## Test
```bash
$ npm test
```

_Note that in order to run the tests you need NodeJs version >= 6_

## License
Copyright (c) 2017 Ioannis Tzanellis<br>
[Released under the MIT license](https://github.com/jahnestacado/cousteau/blob/master/LICENSE)
