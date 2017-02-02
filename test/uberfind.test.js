"use strict"

const mock = require("mock-fs");
const uberfind = require("./../lib/uberfind.js");
const chai = require("chai");
const expect = chai.expect;

mock({
    "/uberfind/GOT/Starks" : {
        "Eddard": {
            "Rob": "-",
            "John": mock.symlink({
                path: "/uberfind/GOT/Starks/Lyanna/John"
            }),
            "Sansa": "-",
            "Arya": "-",
            "Brandon": "-",
            "Rickon": "-",
        },
        "Lyanna": {
            "John": "-",
        },
    },
    "/uberfind/GOT/Baratheons" : {
        "Steffon": {
            "Robert": {
                "Joffrey": mock.symlink({
                    path: "/uberfind/GOT/Lannisters/Jaime/Joffrey"
                }),
                "Myrcella": mock.symlink({
                    path: "/uberfind/GOT/Lannisters/Jaime/Myrcella"
                }),
                "Tommen": mock.symlink({
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


describe("when calling uberfind on the /uberfind/GOT/ dir", () => {
    let result;
    before((done) => {
        uberfind("/uberfind/GOT/").then((_result) => {
            result = _result;
            done();
        });
    });

    it("should find 7 directories", () => {
        expect(result.dirs).to.have.lengthOf(7);
    });

    it("should find 9 files", () => {
        expect(result.files).to.have.lengthOf(9);
    });

    it("should find 3 broken symlinks", () => {
        expect(result.brokenSymlinks).to.have.lengthOf(3);
    });
});
