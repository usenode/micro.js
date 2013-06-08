
var litmus   = require('litmus'),
    micro    = require('../lib/micro');
    Promise  = require('promised-io/promise').Promise,
    spectrum = require('spectrum');

function testWebapp (method, url, setup, test) {


    setup(Webapp, Webapp.get);

    webapp.handle(request, response);

    test(request, response);
}

module.exports = new litmus.Test(module, function () {
    
    var test = this;

    this.async('micro exports webapp', function (done) {
        this.ok(typeof micro.webapp == 'function', "micro has a webapp factory");
        done.resolve();
    });
    
    this.async('micro.webapp() returns a Webapp', function (done) {
        var Webapp = micro.webapp();
        this.ok(typeof Webapp      == 'function', "Webapp can be constructed");
        this.ok(typeof Webapp.get  == 'function', "Webapp has a get handler");
        this.ok(typeof Webapp.post == 'function', "Webapp has a post handler");
        this.ok(typeof Webapp.put  == 'function', "Webapp has a put handler");
        this.ok(typeof Webapp.del  == 'function', "Webapp has a delete handler");
        done.resolve();
    });
    
    this.async('can create new Webapp', function (done) {
        var Webapp = micro.webapp();
        var instance = new Webapp;
        
        this.ok(instance instanceof Webapp, "Can create instance of Webapp");
        this.ok(typeof instance.handle == 'function', "Webapp instance has handle method");
        done.resolve();
    });
    
    this.async('webapp can handle requests', function (done) {
        var passedRequest,
            passedResponse,
            mockRequest = {
                url    : '/test',
                method : 'GET'
            },
            mockResponse = {},
            Webapp = micro.webapp();
            webapp = new Webapp,
            get = Webapp.get;

        Webapp.get('/test', function (request, response) {
            passedRequest = mockRequest;
            passedResponse = mockResponse
        });

        (new Webapp).handle(mockRequest, mockResponse);

        test.ok(mockRequest === passedRequest, "request passed in");
        test.ok(mockResponse === passedResponse, "request passed in");

        done.resolve();
    });

});
