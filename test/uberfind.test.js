"use strict"

const mockfs = require("mock-fs");
const uberfind = require("./../lib/uberfind.js");
const chai = require("chai");
chai.use(require("chai-shallow-deep-equal"));
const expect = chai.expect;

const eddardStarkDirUid = 7;
const johnStarkFileGid = 127;
const lyannaStarkDirBirthtime = {dummyBirthTime: "1st June"};

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
                        gid: johnStarkFileGid,
                        mode: parseInt("0755",8),
                    })
                }
            }),
        },
        "/uberfind/GOT/Baratheons" : {
            "Steffon": {
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

            it("should find 7 directories", () => {
                expect(result.dirs).to.have.lengthOf(7);
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

            it("should find 9 files", () => {
                expect(result.files).to.have.lengthOf(9);
            });

            it("should have only John as symlink", () => {
                expect(symlinkStats).to.have.lengthOf(1);
                expect(symlinkStats[0].path).to.equal("/uberfind/GOT/Starks/Eddard/John");
            });
        });

        const expectedBrokenSymlinks = [
            "/uberfind/GOT/Baratheons/Steffon/Robert/Joffrey",
            "/uberfind/GOT/Baratheons/Steffon/Robert/Myrcella",
            "/uberfind/GOT/Baratheons/Steffon/Robert/Tommen",
        ];
        describe("when testing returned broken symlinks", () => {
            it("should find all the expected broken symlinks", () => {
                expect(result.brokenSymlinks).to.have.members(expectedBrokenSymlinks);
            });
        });
    });

    describe("when calling uberfind on the /uberfind/GOT/ dir with filter options", () => {

        describe(`when ingoring all files that don't have gid == ${johnStarkFileGid} under the GOT dir`, () => {

            let result;
            const ignoreRules = {file :{gid: (id) => id !== johnStarkFileGid}};
            before((done) => {
                uberfind("/uberfind/GOT", ignoreRules).then((_result) => {
                    result = _result;
                    done();
                });
            });

            const expectedStats = [
                {
                path: "/uberfind/GOT/Starks/Eddard/John",
                gid: 127,
                mode: 33261,
                },
                {
                path: "/uberfind/GOT/Starks/Lyanna/John",
                gid: 127,
                mode: 33261,
                },
            ];
            it("should return only one file with the expected filepath", () => {
                expect(result.files).to.shallowDeepEqual(expectedStats);
            });
        });
    });

    after(() => {
        mockfs.restore();
        console.log("  #################### End of uberfind tests");
    });
});
