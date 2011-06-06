var micro = require('./../lib/micro.js');

exports["micro exports webapp"] = function (test) {

	test.ok(typeof micro.webapp == 'function');
	test.done()
}
