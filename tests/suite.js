
var litmus = require('litmus');

module.exports = new litmus.Suite(module, [
    require('./test-micro'),
    require('./routing')
]);

