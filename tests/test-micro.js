
/**
 * Mock a JSGI request object
 */
function mockRequest (method, url) {
    var request = {};
    request["method"] = method;
    request.pathInfo = url;
    return request;
}

var litmus = require('litmus');

exports.test = new litmus.Test('test description', function () {
    
    var micro   = require('./../lib/micro.js'),
        Promise = require('promised-io/lib/promise').Promise;
    
    this.async('micro exports webapp', function (handle) {
        this.ok(typeof micro.webapp == 'function');
        handle.finish();
    });
    
    this.async('micro.webapp() returns a Webapp', function (handle) {
        var Webapp = micro.webapp();
        this.ok(typeof Webapp      == 'function', "Webapp can be constructed");
        this.ok(typeof Webapp.get  == 'function', "Webapp has a get handler");
        this.ok(typeof Webapp.post == 'function', "Webapp has a post handler");
        this.ok(typeof Webapp.put  == 'function', "Webapp has a put handler");
        this.ok(typeof Webapp.del  == 'function', "Webapp has a delete handler");
        handle.finish();
    });
    
    this.async('can create new Webapp', function (handle) {
        var Webapp = micro.webapp();
        var instance = new Webapp;
        
        this.ok(instance instanceof Webapp);
        this.ok(typeof instance.handle == 'function');
        handle.finish();
    });
    
    this.async('webapp can handle requests', function (handle) {
        //this.expect(2);
        
        var Webapp  = micro.webapp(),
            mockReq = mockRequest('GET', '/test');
        
        var test = this;
        
        Webapp.get('/test', function (request, response) {
            test.ok("handler callback executes");
            test.is(mockReq, request, "route callback is passed the request");
            test.ok(typeof response  == 'object', "route callback has a response object");
            
            handle.finish();
        });
        
        var instance = new Webapp();
        instance.handle(mockReq);
    });
    
    this.async('successful string response', function (handle) {
        
        var Webapp            = micro.webapp(),
            successfulRequest = mockRequest('GET', '/test');
        
        Webapp.get('/test', function (request, response) {
            response.ok("text/plain");
            return "hello";
        });
        
        var instance = new Webapp(),
            actualResponse = instance.handle(successfulRequest);
        
        this.ok(typeof actualResponse == 'object', "simple route that returns response from handle");
        this.is(200, actualResponse.status, "successful request sets 200 status on response");
        handle.finish();
    });
    
    this.async('not found string response', function (handle) {
        
        var Webapp            = micro.webapp(),
            notfoundRequest = mockRequest('GET', '/test');
        
        Webapp.get('/test', function (request, response) {
            response.notFound("text/plain");
            return "";
        });
        
        var instance = new Webapp(),
            actualResponse = instance.handle(notfoundRequest);
        
        this.is(404, actualResponse.status, "not found request sets 404 status on response");
        handle.finish();
    });
    
    this.async('successful promise response', function (handle) {
        
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
        
        var test = this;
        
        handledPromise.then(function (actualResponse) {
        
            test.ok(typeof actualResponse == 'object', "simple route that returns response from handle");
            test.is(200, actualResponse.status, "successful request sets 200 status on response");
            handle.finish();
        });
    });
    
    this.async('not found promise response resolved with empty string', function (handle) {
        
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
        
        var test = this;
        
        handledPromise.then(function (actualResponse) {    
            test.is(404, actualResponse.status, "not found request sets 404 status on response");
            handle.finish();
        });
    });
    
    this.async('promise response rejected returns internal server error', function (handle) {
        
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
        
        var test = this;
        
        handledPromise.then(function (actualResponse) {
            test.is(500, actualResponse.status, "rejected promise sets 500 status on response");
            handle.finish();
        });
    });
    /*
    this.async('handle public templates', function (handle) {
        
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
        
        var test = this;
        
        handledPromise.then(function (actualResponse) {
            test.is(500, actualResponse.status, "rejected promise sets 500 status on response");
            handle.finish();
        });
    });
    
    */
});