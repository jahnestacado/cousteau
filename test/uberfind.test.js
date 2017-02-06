"use strict"

const mockfs = require("mock-fs");
const uberfind = require("./../lib/uberfind.js");
const chai = require("chai");
chai.use(require("chai-shallow-deep-equal"));
const expect = chai.expect;

const eddardStarkDirUid = 7;
const johnSnowFileGid = 127;
const lyannaStarkDirBirthtime = new Date("November 5, 1605 23:59:00");
const varysFileGid = 33;

const setupMockfs = () => {
    mockfs({
        "/uberfind/GOT/Starks" : {
            "Eddard": mockfs.directory({
                mode: parseInt("0777",8),
                uid: eddardStarkDirUid,
                items: {
                    "Rob": "-",
                    "John": mockfs.symlink({
                        path: "/uberfind/GOT/Starks/Lyanna/John",
                        gid: 0,
                    }),
                    "Sansa": "-",
                    "Arya": "-",
                    "Brandon": "-",
                    "Rickon": "-",
                }
            }),
            "Lyanna": mockfs.directory({
                mode: parseInt("0777",8),
                birthtime: lyannaStarkDirBirthtime,
                items: {
                    "John": mockfs.file({
                        content: "-",
                        gid: johnSnowFileGid,
                        mode: parseInt("0755",8),
                    })
                }
            }),
        },
        "/uberfind/GOT/Baratheons" : {
            "Robert": {
                "Joffrey": mockfs.symlink({
                    path: "/uberfind/GOT/Lannisters/Jaime/Joffrey"
                }),
                "Myrcella": mockfs.symlink({
                    path: "/uberfind/GOT/Lannisters/Jaime/Myrcella"
                }),
                "Tommen": mockfs.symlink({
                    path: "/uberfind/GOT/Lannisters/Jaime/Tommen"
                }),
            },
            "Stannis": {
                "Shireen": "-",
            },
            "Renly": "-",
        },
        "/uberfind/Whisperers": {
            "Volantis": mockfs.directory({
                items: {
                    "Varys": mockfs.symlink({
                        path: "/uberfind/Whisperers/Kings-Landing/Varys",
                    }),
                }
            }),
            "Kings-Landing": mockfs.directory({
                items: {
                    "Varys": mockfs.symlink({
                        path: "/uberfind/Whisperers/Lys/Varys",
                    }),
                }
            }),
            "Lys": {
                "Varys": mockfs.file({
                    gid: varysFileGid,
                })
            },
        },
    });
};

describe("#################### Start uberfind find tests", () => {
    before(() => {
        setupMockfs();
    });

    describe("when calling uberfind on the /uberfind/GOT/ dir without filter options", () => {
        let result;
        before((done) => {
            uberfind("/uberfind/GOT/").then((_result) => {
                result = _result;
                done();
            });
        });

        const numOfDirSymlinks = 0;
        describe("when testing returned directory stats", () => {
            let symlinkStats;
            before(() => {
                symlinkStats = result.dirs.filter((stats) => stats.isSymbolicLink());
            });

            const expectedDirStats = [
                {
                    path: "/uberfind/GOT/Baratheons",
                },
                {
                    path: "/uberfind/GOT/Starks",
                },
                {
                    path: "/uberfind/GOT/Baratheons/Robert",
                },
                {
                    path: "/uberfind/GOT/Baratheons/Stannis",
                },
                {
                    path: "/uberfind/GOT/Starks/Eddard",
                    uid: eddardStarkDirUid,
                },
                {
                    path: "/uberfind/GOT/Starks/Lyanna",
                    birthtime: lyannaStarkDirBirthtime,
                },
            ];
            it("should find the expected stats of 6 directories", () => {
                expect(result.dirs).to.shallowDeepEqual(expectedDirStats);
            });

            it("should not have any symlinkStats", () => {
                expect(symlinkStats).to.have.lengthOf(0);
            });
        });

        describe("when testing returned file stats", () => {
            let symlinkStats;
            before(() => {
                symlinkStats = result.files.filter((stats) => stats.isSymbolicLink());
            });

            const expectedFileStats = [
                {
                    path: "/uberfind/GOT/Baratheons/Renly",
                },
                {
                    path: "/uberfind/GOT/Baratheons/Stannis/Shireen",
                },
                {
                    path: "/uberfind/GOT/Starks/Eddard/Arya",
                },
                {
                    path: "/uberfind/GOT/Starks/Eddard/Brandon",
                },
                {
                    path: "/uberfind/GOT/Starks/Eddard/Rickon",
                },
                {
                    path: "/uberfind/GOT/Starks/Eddard/Rob",
                },
                {
                    path: "/uberfind/GOT/Starks/Eddard/Sansa",
                },
                {
                    path: "/uberfind/GOT/Starks/Eddard/John",
                    gid: johnSnowFileGid,
                },
                {
                    path: "/uberfind/GOT/Starks/Lyanna/John",
                    gid: johnSnowFileGid,
                },
            ];
            it("should find the expected stats of 9 files", () => {
                expect(result.files).to.shallowDeepEqual(expectedFileStats);
            });

            it("should have only John as symlink", () => {
                expect(symlinkStats).to.have.lengthOf(1);
                expect(symlinkStats[0].path).to.equal("/uberfind/GOT/Starks/Eddard/John");
            });
        });

        const expectedBrokenSymlinks = [
            "/uberfind/GOT/Baratheons/Robert/Joffrey",
            "/uberfind/GOT/Baratheons/Robert/Myrcella",
            "/uberfind/GOT/Baratheons/Robert/Tommen",
        ];
        describe("when testing returned broken symlinks", () => {
            it("should find all the expected broken symlinks", () => {
                expect(result.brokenSymlinks).to.have.members(expectedBrokenSymlinks);
            });
        });
    });

    describe("when calling uberfind on the /uberfind/GOT/ dir with filter options", () => {

        describe(`when ingoring all files that don't have gid == ${johnSnowFileGid} under the GOT dir`, () => {
            let result;
            const ignoreRules = {file :{gid: (id) => id !== johnSnowFileGid}};
            before((done) => {
                uberfind("/uberfind/GOT", ignoreRules).then((_result) => {
                    result = _result;
                    done();
                });
            });

            const expectedStats = [
                {
                    path: "/uberfind/GOT/Starks/Eddard/John",
                    gid: johnSnowFileGid,
                    mode: 33261,
                },
                {
                    path: "/uberfind/GOT/Starks/Lyanna/John",
                    gid: johnSnowFileGid,
                    mode: 33261,
                },
            ];
            it("should return both original and linked file stats (Eddard/John and Lyanna/John files)", () => {
                expect(result.files).to.shallowDeepEqual(expectedStats);
            });
        });

        describe(`when ingoring all files under dirs that don't have birthtime == ${lyannaStarkDirBirthtime} under the /GOT/Starks dir`, () => {
            let result;
            const ignoreRules = {dir :{birthtime: (bt) => bt !== lyannaStarkDirBirthtime}};
            before((done) => {
                uberfind("/uberfind/GOT/Starks", ignoreRules).then((_result) => {
                    result = _result;
                    done();
                });
            });

            const expectedStats = [
                {
                    path: "/uberfind/GOT/Starks/Lyanna/John",
                    gid: johnSnowFileGid,
                    mode: 33261,
                },
            ];
            it("should return only Lyanna/John actual file stats but not its symlink", () => {
                expect(result.files).to.shallowDeepEqual(expectedStats);
            });
        });

        describe(`when testing filters in combination with double-linked files`, () => {
            let result;
            const ignoreRules = {file :{gid: (id) => id !== varysFileGid}};
            before((done) => {
                uberfind("/uberfind/Whisperers/Volantis", ignoreRules).then((_result) => {
                    result = _result;
                    done();
                });
            });

            const expectedStats = [
                {
                    path: "/uberfind/Whisperers/Volantis/Varys",
                    gid: varysFileGid,
                }
            ];
            it("should return the expected stats of the Volantis/Varys file", () => {
                expect(result.files).to.shallowDeepEqual(expectedStats);
            });
        });
    });

    after(() => {
        mockfs.restore();
        console.log("  #################### End of uberfind tests");
    });
});
