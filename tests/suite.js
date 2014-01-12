
var litmus = require('litmus');

module.exports.test = new litmus.Suite(module, [
    require('./test-micro').test,
    require('./routing').test
]);

