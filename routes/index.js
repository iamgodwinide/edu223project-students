const router = require("express").Router();
const Material = require("../models/Material");
const Result = require("../models/Result");
const calculate_gpa = require('../utils/gpaCalculator');
const { ensureAuthenticated } = require("../config/auth")

router.get("/", ensureAuthenticated, async (req, res) => {
    try {
        return res.render("index", { page_title: "EDUSOP | Welcome", req });
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
            return res.render("materials", { page_title: "EDUSOP | Materials", materials, req });
        }
        return res.render("materialForm", { page_title: "EDUSOP | Materials", req });
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
            return res.render("results", { page_title: "EDUSOP | Results", results: [], req });
        }


        results.forEach((r, index) => {
            if (resultobj[r.session + r.semester]) {
                resultobj[r.session + r.semester].push(r);
            } else {
                resultobj[r.session + r.semester] = [r];
            }

            if ((index + 1) === results.length) {
                Object.keys(resultobj).forEach((key, index, arr) => {
                    resultsArr.push(resultobj[key])
                    if ((index + 1) == arr.length) {
                        return res.render("results", { page_title: "EDUSOP | Results", results: resultsArr.reverse(), req });
                    }
                });
            }
        });


    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.get("/results/:session1/:session2/:level/:semester", ensureAuthenticated, async (req, res) => {
    try {
        const { session1, session2, course, level, semester } = req.params;

        const results = (await Result.find({
            session: `${session1}/${session2}`,
            level,
            matno: req.user.matno,
            semester: semester.toLowerCase()
        }))
        const totalcredits = results.reduce((prev, curr) => prev + Number(curr.credit), 0);
        return res.render("viewResults", { page_title: "EDUSOP | Results", results, totalcredits, calculate_gpa, req });
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});




module.exports = router;