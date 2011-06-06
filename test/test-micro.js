var micro = require('./../lib/micro.js'),
	Promise = require('promised-io/lib/promise').Promise;

/**
 * Mock a JSGI request object
 */
function mockRequest (method, url) {
	var request = {};
	request["method"] = method;
	request.pathInfo = url;
	return request;
}

exports["micro exports webapp"] = function (test) {
	test.ok(typeof micro.webapp == 'function');
	test.done();
}

exports["micro.webapp() returns a Webapp"] = function (test) {
	var Webapp = micro.webapp();
	test.ok(typeof Webapp      == 'function', "Webapp can be constructed");
	test.ok(typeof Webapp.get  == 'function', "Webapp has a get handler");
	test.ok(typeof Webapp.post == 'function', "Webapp has a post handler");
	test.ok(typeof Webapp.put  == 'function', "Webapp has a put handler");
	test.ok(typeof Webapp.del  == 'function', "Webapp has a delete handler");
	test.done();
}

exports["can create new Webapp"] = function (test) {
	var Webapp = micro.webapp();
	var instance = new Webapp;
	
	test.ok(instance instanceof Webapp);
	test.ok(typeof instance.handle == 'function');
	test.done();
}

exports["webapp can handle requests"] = function (test) {
	//test.expect(2);
	
	var Webapp = micro.webapp();
	
	Webapp.get('/test', function () {
		test.ok(true, 'handler callback executes');
		test.done();
	});
	
	var instance       = new Webapp(),
	    request        = mockRequest('GET', '/test'),
	    handledPromise = instance.handle(request);
	
	test.ok(typeof handledPromise.then == 'function', "handle returns a promise");		
}
