const router = require("express").Router();
const User = require("../models/User");
const Admin = require("../models/Admin");
const Material = require("../models/Material");
const Department = require("../models/Department");
const Result = require("../models/Result");
const ResultList = require("../models/ResultList");
const bcrypt = require("bcryptjs");
const csv = require('csvtojson');
const path = require("path")
const getGrade = require("../utils/getGrade");
const calculate_gpa = require('../utils/gpaCalculator');
const { ensureAuthenticated } = require("../config/auth")

router.get("/", ensureAuthenticated, async (req, res) => {
    try {
        return res.render("index", { page_title: "Welcome", req });
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.get("/materials", ensureAuthenticated, async (req, res) => {
    try {
        const { semester, level, department } = req.query;
        if (semester && level && department) {
            const materials = await Material.find({ semester, level, department });
            return res.render("materials", { page_title: "Materials", materials, req });
        }
        return res.render("materialForm", { page_title: "Materials", req });
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
})


router.get("/results", ensureAuthenticated, async (req, res) => {
    try {
        const results = await Result.find({ matno: req.user.matno });

        const resultobj = {};
        const resultsArr = [];

        if (results.length === 0) {
            return res.render("results", { page_title: "Results", results: [], req });
        }

        results.forEach(r => {
            if (resultobj[r.session + r.semester]) {
                resultobj[r.session + r.semester].push(r);
            } else {
                resultobj[r.session + r.semester] = [r];
            }
        });

        Object.keys(resultobj).forEach((key, index, arr) => {
            resultsArr.push(resultobj[key])
            if ((index + 1) == arr.length) {
                return res.render("results", { page_title: "Results", results: resultsArr.reverse(), req });
            }
        });
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.get("/results/:session1/:session2/:course/:level/:semester", ensureAuthenticated, async (req, res) => {
    try {
        const { session1, session2, course, level, semester } = req.params;

        const results = (await Result.find({
            session: `${session1}/${session2}`,
            course: course.toUpperCase(),
            level,
            matno: req.user.matno,
            semester: semester.toLowerCase()
        })).reverse();

        const totalcredits = results.reduce((prev, curr) => prev + Number(curr.credit), 0)

        return res.render("viewResults", { page_title: "Results", results, totalcredits, calculate_gpa, req });
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.get("/add-results", ensureAuthenticated, (req, res) => {
    try {
        return res.render("addResults", { page_title: "Upload Results", req });

    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.post("/add-results", ensureAuthenticated, async (req, res) => {
    try {

        let success_counter = 0;
        let failed_counter = 0;
        let updated_counter = 0;

        const {
            course,
            department,
            level,
            semester,
            session,
            credit
        } = req.body;

        const resultfile = req.files.csv;

        if (!course || !department || !level || !semester || !session || !credit) {
            return res.render("addResults", { page_title: "Upload Results", ...req.body, error_msg: "Please provide all reuired fields", req });
        };

        if (!resultfile) {
            return res.render("addResults", { page_title: "Upload Results", ...req.body, error_msg: "Please upload csv file", req });
        }

        if (resultfile.mimetype !== "text/csv") {
            return res.render("addResults", { page_title: "Upload Results", ...req.body, error_msg: "Please upload a valid csv file", req });
        }

        const csvFilePath = path.join(__dirname, "../", req.files.csv.tempFilePath);
        const jsonArray = await csv({
            trim: true
        }).fromFile(csvFilePath);

        const resultshape = jsonArray[0];

        if (!resultshape) {
            return res.render("addResults", { page_title: "Upload Results", ...req.body, error_msg: "CSV file must not be empty", req });
        }

        if (!resultshape.matno || !resultshape.score) {
            return res.render("addResults", { page_title: "Upload Results", ...req.body, error_msg: "Must contain matno and socre heading", req });
        }

        const resultListExists = await ResultList.findOne({ course: course.toUpperCase(), session, level, semester });

        if (resultListExists) {
            await resultListExists.updateOne({
                credit,
                department,
            })
        } else {
            const newResultList = {
                course: course.toUpperCase(),
                department,
                level,
                semester,
                session,
                credit,
                author: "Godwin Idemudia"
            };

            const newResultListDoc = new ResultList(newResultList);
            await newResultListDoc.save();
        }

        jsonArray.forEach(async (result, index) => {
            const { matno, score } = result;
            if (!matno || !score) {
                failed_counter += 1;
            } else {
                const resultExists = await Result.findOne({ course: course.toUpperCase(), session, matno: matno.toUpperCase(), level, semester });
                if (resultExists) {
                    await resultExists.updateOne({
                        score,
                        course: course.toUpperCase(),
                        department,
                        level,
                        semester,
                        session,
                        credit,
                        grade: getGrade(score)
                    })
                    updated_counter += 1;
                } else {
                    const newResult = {
                        score,
                        matno,
                        course: course.toUpperCase(),
                        department,
                        level,
                        semester,
                        session,
                        credit,
                        grade: getGrade(score)
                    };

                    const newResultDoc = new Result(newResult);
                    await newResultDoc.save();
                    success_counter += 1;
                }
            }
            if ((index + 1) === jsonArray.length) {
                req.flash("success_msg", `Operation completed, Total added: ${success_counter}, Toal updated: ${updated_counter}, Failed uploads: ${failed_counter}.`);
                return res.redirect("/add-results");
            }
        });
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});


module.exports = router;