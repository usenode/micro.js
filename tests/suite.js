
var litmus = require('litmus');

module.exports = new litmus.Suite(module, [
    require('./micro'),
    require('./routing')
]);

