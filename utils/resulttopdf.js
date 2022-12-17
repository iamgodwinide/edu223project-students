const pdf = require("pdf-creator-node");
const fs = require("fs");


const html = fs.readFileSync("../htmltemplates/result.html", "utf8");

const options = {
    format: "A3",
    orientation: "portrait",
    border: "10mm",
    timeout: '100000'
};

const document = {
    html: html,
    data: {
        user: {
            firstname: "Godwin",
            lastname: "Idemudia",
            middlename: "",
            department: "CIT",
            matno: "EDU1903074",
            session: "2019/2020"
        }
    },
    path: "./output.pdf",
    type: "",
};

pdf
    .create(document, options)
    .then((res) => {
        console.log(res);
    })
    .catch((error) => {
        console.error(error);
    });