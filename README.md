# uberfind
-----------
Recursive directory walker that retrieves all sub-directory and file paths along with their [stats](https://nodejs.org/api/fs.html#fs_class_fs_stats).

## Features

* Recursively traverses each sub-directory
* Asynchronous
* Filtering support based on [Uberstats](#UberStats) properties
* Follows symlinks and filtering is applied based on the original target file/directory
* Finds brokenSymlinks

## Install
```bash
$ npm install uberfind
```
## API
The function accepts three arguments

__uberfind(path, [ignoreOptions], callback)__

 * ```path``` - The target directory path
 * ```ingoreOptions``` - Optional filtering option
 * ```callback``` - The callback gets two arguments ```(errors, result)``` where result is an object with below structure


 ```javascript
    // Result object
    {
        dirs: [UberStats],
        files: [UberStats],
        brokenSymlinks: [String],
    }
```

#### UberStats<a name="UberStats"></a>

Is an [fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats) instance extended with the ```path``` property.

For example:
```javascript

    {
      path string
      dev string
      mode string
      nlink string
      uid string
      gid string
      rdev string
      blksize string
      ino string
      size string
      blocks string
      atime string
      mtime string
      ctime string
      birthtime string
    }
```

The ```filterOption``` can be applied to one or more of the [UberStats](#UberStats) properties either on the directories and/or the files.

### Example
```javascript

const uberfind = require("uberfind");

// Without filtering
uberfind(aPath, (errors, result) => {
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
    }
};

uberfind(aPath, filterOption, (errors, result) => {
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
[Released under the MIT license](https://github.com/jahnestacado/uberfind/blob/master/LICENSE)
