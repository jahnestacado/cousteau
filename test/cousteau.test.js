/**
* cousteau <https://github.com/jahnestacado/cousteau>
* Copyright (c) 2017 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
"use strict"

const mockfs = require("mock-fs");
const cousteau = require("./../lib/cousteau.js");
const chai = require("chai");
chai.use(require("chai-shallow-deep-equal"));
const expect = chai.expect;

const eddardStarkDirUid = 7;
const johnSnowFileGid = 127;
const lyannaStarkDirBirthtime = new Date("November 5, 1605 23:59:00");
const varysFileGid = 33;

const setupMockfs = () => {
    mockfs({
        "/cousteau/GOT/House/Stark" : {
            "Eddard": mockfs.directory({
                mode: parseInt("0777",8),
                uid: eddardStarkDirUid,
                items: {
                    "Rob": "-",
                    "John": mockfs.symlink({
                        path: "/cousteau/GOT/House/Stark/Lyanna/John",
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
                        gid: johnSnowFileGid,
                        mode: parseInt("0755",8),
                    })
                }
            }),
        },
        "/cousteau/GOT/House/Baratheon" : {
            "Robert": {
                "Joffrey": mockfs.symlink({
                    path: "/cousteau/GOT/House/Lannister/Jaime/Joffrey"
                }),
                "Myrcella": mockfs.symlink({
                    path: "/cousteau/GOT/House/Lannister/Jaime/Myrcella"
                }),
                "Tommen": mockfs.symlink({
                    path: "/cousteau/GOT/House/Lannister/Jaime/Tommen"
                }),
            },
            "Stannis": {
                "Shireen": "-",
            },
            "Renly": "-",
        },
        "/cousteau/GOT/Whisperers": {
            "Volantis": mockfs.directory({
                items: {
                    "Varys": mockfs.symlink({
                        path: "/cousteau/GOT/Whisperers/Kings-Landing/Varys",
                    }),
                }
            }),
            "Kings-Landing": mockfs.directory({
                items: {
                    "Varys": mockfs.symlink({
                        path: "/cousteau/GOT/Whisperers/Lys/Varys",
                    }),
                }
            }),
            "Lys": {
                "Varys": mockfs.file({
                    gid: varysFileGid,
                })
            },
        },
        "/cousteau/GOT/The Wall": {
            "inside": mockfs.directory({
                items: {
                    "Castle Black": "-",
                    "Shadow Tower": mockfs.file({
                        mode: parseInt("0111",8),
                    }),
                    "Eastwatch": "-",
                }
            }),
            "beyond": mockfs.directory({
                mode: parseInt("0000",8),
                items: {
                    "White Tree": "-",
                    "Craster's Keep": "-",
                }
            }),
        },
    });
};

describe("#################### Start cousteau find tests", () => {
    before(() => {
        setupMockfs();
    });

    describe("when calling cousteau on the /cousteau/GOT/House dir without filter options", () => {
        let result, errors;
        before((done) => {
            cousteau("/cousteau/GOT/House", (_errors, _result) => {
                result = _result;
                errors = _errors;
                done();
            });
        });

        it("should not return any errors", () => {
            expect(errors).to.have.lengthOf(0);
        });

        describe("when testing returned directory stats", () => {
            let symlinkStats;
            before(() => {
                symlinkStats = result.dirs.filter((stats) => stats.isSymbolicLink());
            });

            const expectedDirStats = [
                {
                    path: "/cousteau/GOT/House/Baratheon",
                },
                {
                    path: "/cousteau/GOT/House/Stark",
                },
                {
                    path: "/cousteau/GOT/House/Baratheon/Robert",
                },
                {
                    path: "/cousteau/GOT/House/Baratheon/Stannis",
                },
                {
                    path: "/cousteau/GOT/House/Stark/Eddard",
                    uid: eddardStarkDirUid,
                },
                {
                    path: "/cousteau/GOT/House/Stark/Lyanna",
                    birthtime: lyannaStarkDirBirthtime,
                },
            ];
            it("should find the expected stats of 6 directories", () => {
                expect(result.dirs).to.shallowDeepEqual(expectedDirStats);
                expect(result.dirs).to.have.lengthOf(expectedDirStats.length);
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
                    path: "/cousteau/GOT/House/Baratheon/Renly",
                },
                {
                    path: "/cousteau/GOT/House/Baratheon/Stannis/Shireen",
                },
                {
                    path: "/cousteau/GOT/House/Stark/Eddard/Arya",
                },
                {
                    path: "/cousteau/GOT/House/Stark/Eddard/Brandon",
                },
                {
                    path: "/cousteau/GOT/House/Stark/Eddard/Rickon",
                },
                {
                    path: "/cousteau/GOT/House/Stark/Eddard/Rob",
                },
                {
                    path: "/cousteau/GOT/House/Stark/Eddard/Sansa",
                },
                {
                    path: "/cousteau/GOT/House/Stark/Eddard/John",
                    gid: johnSnowFileGid,
                },
                {
                    path: "/cousteau/GOT/House/Stark/Lyanna/John",
                    gid: johnSnowFileGid,
                },
            ];
            it("should find the expected stats of 9 files", () => {
                expect(result.files).to.shallowDeepEqual(expectedFileStats);
                expect(result.files).to.have.lengthOf(expectedFileStats.length);
            });

            it("should have only John as symlink", () => {
                expect(symlinkStats).to.have.lengthOf(1);
                expect(symlinkStats[0].path).to.equal("/cousteau/GOT/House/Stark/Eddard/John");
            });
        });

        const expectedBrokenSymlinks = [
            "/cousteau/GOT/House/Baratheon/Robert/Joffrey",
            "/cousteau/GOT/House/Baratheon/Robert/Myrcella",
            "/cousteau/GOT/House/Baratheon/Robert/Tommen",
        ];
        describe("when testing returned broken symlinks", () => {
            it("should find all the expected broken symlinks", () => {
                expect(result.brokenSymlinks).to.have.members(expectedBrokenSymlinks);
            });
        });
    });

    describe("when testing error handling mechanism", function() {
        let result, errors;
        before((done) => {
            cousteau("/cousteau/GOT/The Wall/", (_errors, _result) => {
                result = _result;
                errors = _errors;
                done();
            });
        });

        const expectedErrorMessages =  [
            "EACCES, permission denied \'/cousteau/GOT/The Wall/beyond/Craster\'s Keep\'",
            "EACCES, permission denied \'/cousteau/GOT/The Wall/beyond/White Tree\'",
        ];
        it("should return the expected errors", () => {
            const errorMessages = errors.map((e) => e.message);
            expect(errorMessages).to.have.members(expectedErrorMessages);
        });

        it("should not have any brokenSymlinks", () => {
            expect(result.brokenSymlinks).to.have.lengthOf(0);
        });

        describe("when testing returned directory stats", () => {
            let symlinkStats;
            before(() => {
                symlinkStats = result.dirs.filter((stats) => stats.isSymbolicLink());
            });

            const expectedDirStats = [
                {
                    path: "/cousteau/GOT/The Wall/beyond",
                },
                {
                    path: "/cousteau/GOT/The Wall/inside",
                },
            ];
            it("should find the expected stats of 2 directories", () => {
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
                    path: "/cousteau/GOT/The Wall/inside/Castle Black",
                },
                {
                    path: "/cousteau/GOT/The Wall/inside/Eastwatch",
                },
                {
                    path: "/cousteau/GOT/The Wall/inside/Shadow Tower",
                },
            ];
            it("should find the expected stats of 3 files", () => {
                expect(result.files).to.shallowDeepEqual(expectedFileStats);
                expect(result.files).to.have.lengthOf(3);
            });

            it("should not have any symlinkStats", () => {
                expect(symlinkStats).to.have.lengthOf(0);
            });
        });
    });

    describe("when calling cousteau on the /cousteau/GOT/House dir with filter options", () => {

        describe(`when ingoring all files that don't have gid == ${johnSnowFileGid} under the GOT dir`, () => {
            let result, errors;
            const ignoreRules = {file :{gid: (id) => id !== johnSnowFileGid}};
            before((done) => {
                cousteau("/cousteau/GOT/House", ignoreRules, (_errors, _result) => {
                    result = _result;
                    errors = _errors;
                    done();
                });
            });

            it("should not return any errors", () => {
                expect(errors).to.have.lengthOf(0);
            });

            const expectedBrokenSymlinks = [
                "/cousteau/GOT/House/Baratheon/Robert/Joffrey",
                "/cousteau/GOT/House/Baratheon/Robert/Myrcella",
                "/cousteau/GOT/House/Baratheon/Robert/Tommen",
            ];
            describe("when testing returned broken symlinks", () => {
                it("should find all the expected broken symlinks", () => {
                    expect(result.brokenSymlinks).to.have.members(expectedBrokenSymlinks);
                });
            });

            const expectedStats = [
                {
                    path: "/cousteau/GOT/House/Stark/Eddard/John",
                    gid: johnSnowFileGid,
                    mode: 33261,
                },
                {
                    path: "/cousteau/GOT/House/Stark/Lyanna/John",
                    gid: johnSnowFileGid,
                    mode: 33261,
                },
            ];
            it("should return both original and linked file stats (Eddard/John and Lyanna/John files)", () => {
                expect(result.files).to.shallowDeepEqual(expectedStats);
                expect(result.files).to.have.lengthOf(expectedStats.length);
            });
        });

        describe(`when ingoring all files under dirs that don't have birthtime == ${lyannaStarkDirBirthtime} under the /GOT/Starks dir`, () => {
            let result;
            const ignoreRules = {dir :{birthtime: (bt) => bt !== lyannaStarkDirBirthtime}};
            before((done) => {
                cousteau("/cousteau/GOT/House/Stark", ignoreRules, (errors, _result) => {
                    result = _result;
                    done();
                });
            });

            const expectedStats = [
                {
                    path: "/cousteau/GOT/House/Stark/Lyanna/John",
                    gid: johnSnowFileGid,
                    mode: 33261,
                },
            ];
            it("should return only Lyanna/John actual file stats but not its symlink", () => {
                expect(result.files).to.shallowDeepEqual(expectedStats);
                expect(result.files).to.have.lengthOf(expectedStats.length);
            });
        });

        describe(`when testing filters in combination with double-linked files`, () => {
            let result, errors;
            const ignoreRules = {file :{gid: (id) => id !== varysFileGid}};
            before((done) => {
                cousteau("/cousteau/GOT/Whisperers/Volantis", ignoreRules, (_errors, _result) => {
                    result = _result;
                    errors = _errors;
                    done();
                });
            });

            it("should not return any errors", () => {
                expect(errors).to.have.lengthOf(0);
            });

            it("should not have any brokenSymlinks", () => {
                expect(result.brokenSymlinks).to.have.lengthOf(0);
            });

            const expectedStats = [
                {
                    path: "/cousteau/GOT/Whisperers/Volantis/Varys",
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
        console.log("  #################### End of cousteau tests");
    });
});
