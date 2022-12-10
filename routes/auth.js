const router = require("express").Router();
const passport = require("passport");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { ensureAuthenticated } = require("../config/auth")


router.get("/change-password", ensureAuthenticated, async (req, res) => {
    try {
        return res.render("changePassword", { page_title: "Change Password", req });
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.post("/change-password", ensureAuthenticated, async (req, res) => {
    try {
        const { password, password2 } = req.body;
        if (!password || !password2) {
            req.flash("error_msg", "Please enter all fields");
            return res.redirect("/change-password");
        }
        if (password !== password2) {
            req.flash("error_msg", "Both passsords must be same");
            return res.redirect("/change-password");
        }
        if (password.length < 6) {
            req.flash("error_msg", "Password is too short");
            return res.redirect("/change-password");
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        await User.updateOne({ _id: req.user.id }, { password: hash });
        req.flash("success_msg", "password updated successfully");
        return res.redirect("/change-password");
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.get("/edit-profile", ensureAuthenticated, async (req, res) => {
    try {
        return res.render("editProfile", { page_title: "Edit Profile", req });
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.post("/edit-profile", ensureAuthenticated, async (req, res) => {
    try {
        const { firstname, middlename, lastname, email, level, phone } = req.body;
        if (!firstname || !lastname || !email || !level || !phone) {
            req.flash("error_msg", "please provide all required fields");
            return res.redirect("/edit-profile");
        }
        await User.updateOne({ _id: req.user.id }, { firstname, middlename, lastname, email, level, phone });
        req.flash("success_msg", "account updated sucessfully");
        return res.redirect("/edit-profile");
    } catch (err) {
        console.log(err);
        return res.redirect("/")
    }
});

router.get("/login", (req, res) => {
    try {
        return res.render("login", { req, layout: false })
    } catch (err) {
        console.log(err);
        return res.redirect("/login")
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.flash('success_msg', 'You are logged out');
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
});


module.exports = router;