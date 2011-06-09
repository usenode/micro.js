var micro   = require('./../lib/micro.js'),
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
    
    var Webapp  = micro.webapp(),
        mockReq = mockRequest('GET', '/test');
    
    Webapp.get('/test', function (request, response) {
        test.ok("handler callback executes");
        test.equals(mockReq, request, "route callback is passed the request");
        test.ok(typeof response  == 'object', "route callback has a response object");
        
        test.done();
    });
    
    var instance = new Webapp();
    instance.handle(mockReq);
}

exports["successful string response"] = function (test) {
    
    var Webapp            = micro.webapp(),
        successfulRequest = mockRequest('GET', '/test');
    
    Webapp.get('/test', function (request, response) {
        response.ok("text/plain");
        return "hello";
    });
    
    var instance = new Webapp(),
        actualResponse = instance.handle(successfulRequest);
    
    test.ok(typeof actualResponse == 'object', "simple route that returns response from handle");
    test.equals(200, actualResponse.status, "successful request sets 200 status on response");
    test.done();
}

exports["not found string response"] = function (test) {
    
    var Webapp            = micro.webapp(),
        notfoundRequest = mockRequest('GET', '/test');
    
    Webapp.get('/test', function (request, response) {
        response.notFound("text/plain");
        return "";
    });
    
    var instance = new Webapp(),
        actualResponse = instance.handle(notfoundRequest);
    
    test.equals(404, actualResponse.status, "not found request sets 404 status on response");
    test.done();
}

exports["successful promise response"] = function (test) {
    
    var Webapp            = micro.webapp(),
        successfulRequest = mockRequest('GET', '/test');
    
    Webapp.get('/test', function (request, response) {
        response.ok("text/plain");
        var deferred = new Promise();
        deferred.resolve("hello");
        return deferred;
    });
    
    var instance = new Webapp(),
        handledPromise = instance.handle(successfulRequest);
    
    handledPromise.then(function (actualResponse) {
    
        test.ok(typeof actualResponse == 'object', "simple route that returns response from handle");
        test.equals(200, actualResponse.status, "successful request sets 200 status on response");
        test.done();
    });
}

exports["not found promise response resolved with empty string"] = function (test) {
    
    var Webapp          = micro.webapp(),
        notfoundRequest = mockRequest('GET', '/test');
    
    Webapp.get('/test', function (request, response) {
        response.notFound("text/plain");
        var deferred = new Promise();
        deferred.resolve("");
        return deferred;
    });
    
    var instance = new Webapp(),
        handledPromise = instance.handle(notfoundRequest);
    
    handledPromise.then(function (actualResponse) {    
        test.equals(404, actualResponse.status, "not found request sets 404 status on response");
        test.done();
    });
}

exports["promise response rejected returns internal server error"] = function (test) {
    
    var Webapp  = micro.webapp(),
        mockReq = mockRequest('GET', '/test');
    
    Webapp.get('/test', function (request, response) {
        var deferred = new Promise();
        deferred.reject({
            "toString": function () {
                return "some message"
            },
            "stack" : []
        });
        return deferred;
    });
    
    var instance = new Webapp(),
        handledPromise = instance.handle(mockReq);
    
    handledPromise.then(function (actualResponse) {
        test.equals(500, actualResponse.status, "rejected promise sets 500 status on response");
        test.done();
    });
}
/*
exports["handle public templates"] = function (test) {
    
    var Webapp  = micro.webapp(),
        mockReq = mockRequest('GET', '/test');
    
    Webapp.get('/test', function (request, response) {
        var deferred = new Promise();
        deferred.reject({
            "toString": function () {
                return "some message"
            },
            "stack" : []
        });
        return deferred;
    });
    
    var instance = new Webapp(),
        handledPromise = instance.handle(mockReq);
    
    handledPromise.then(function (actualResponse) {
        test.equals(500, actualResponse.status, "rejected promise sets 500 status on response");
        test.done();
    });
}

*/