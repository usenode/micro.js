var litmus = require('litmus');

exports.test = new litmus.Suite('Micro.js Test Suite', [
    require('./test-micro').test
]);
