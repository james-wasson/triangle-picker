const express = require("express");
const path = require("path");
const os = require("os");
const app = express();
var testDir = path.join(__dirname, "../tests");
console.log(testDir)
var baseDir = path.join(__dirname, "..");
app.use('/tests/jquery', express.static(path.join(testDir, "/jquery")));
app.use('/tests/vue', express.static(path.join(testDir, "/vue")));
app.use('/tests', express.static(path.join(testDir, "/vanilla")));
app.use('/dist', express.static(path.join(baseDir, '/dist')));
app.use('/import', express.static(path.join(baseDir, '/node_modules')));
app.listen(3000, () => console.log("Express listening on port 3000."));