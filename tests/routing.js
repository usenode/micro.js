
var litmus = require('litmus'),
    micro  = require('../lib/micro');

module.exports.test = new litmus.Test('routing', function () {
    var test = this;

    function testRoute (route, shouldMatch, shouldNotMatch) {
        var Webapp = micro.webapp();
        Webapp.get(route, function (request, response) {
            var params = Array.prototype.slice.apply(arguments);
            params.shift();
            params.shift();
            params.shift();
            response.handled = true;
            response.params = params;
        });
        function testResponseMatched (response, url, params) {
            test.async('route: \'' + route + '\', url: \'' + url + '\'', function (done) {
                var check = function (response) {
                    test.ok(response.handled, 'route \'' + route + '\' should match \'' + url + '\'');
                    test.is(response.params, params, 'params for route \'' + route + '\' applied to \'' + url + '\'');
                    done.resolve();
                };
                if (response.then) {
                    response.then(check);
                }
                else {
                    check(response);
                }
            });
        }
        function testResponseDidNotMatch (response, url) {
            test.async('route: \'' + route + '\', url: \'' + url + '\'', function (done) {
                var check = function (response) {
                    test.nok(response.handled, 'route \'' + route + '\' should not match \'' + url + '\'');
                    done.resolve();
                };
                if (response.then) {
                    response.then(check);
                }
                else {
                    check(response);
                }
            });
        }
        var webapp = new Webapp(), response;
        for (var i in shouldMatch) {
            response = {};
            webapp.handle({ method: 'GET', url: i }, response);
            testResponseMatched(
                response,
                i,
                shouldMatch[i]
            );
        }
        for (var i = 0, l = shouldNotMatch.length; i < l; i++) {
            response = {};
            webapp.handle({ method: 'GET', url: shouldNotMatch[i] }, response);
            testResponseDidNotMatch(
                response,
                shouldNotMatch[i]
            );
        }
    }

    test.plan(48);

    testRoute(
        '/',
        { '/' : [] },
        [ '/blah', '//' ]
    );

    testRoute(
        '/some/url.html',
        { '/some/url.html' : [] },
        [ '/', '/some/url.htm', '/some/url.htmll', 'prefix/some/url.html' ]
    );

    testRoute(
        '/:named',
        {
            '/hello' : [ { named : 'hello' } ],
            '/with-hyphens-and_underscores' : [ { named : 'with-hyphens-and_underscores' } ]
        },
        [ '/', '/no.dots', '/*', '/+' ]
    );

    testRoute(
        '/multiple/:named/:params',
        {
            '/multiple/one/two' : [ { named : 'one', params : 'two' } ],
            '/multiple/A-Z0-9/A_Z0_9' : [ { named : 'A-Z0-9', params : 'A_Z0_9' } ]
        },
        [ '/multiple/no.dots/blah' ]
    );

    testRoute(
        '/*',
        { '/hello' : [ 'hello' ], '/h-y-p-h-e-n-s' : [ 'h-y-p-h-e-n-s' ], '/under_score_s' : [ 'under_score_s' ] },
        [ '/', '//', '/+', '/hello/', '/hello/hello' ]
    );
        
    testRoute(
        '/:named[a{3,4}]',
        { '/aaa' : [ { named : 'aaa' } ], '/aaaa' : [ { named : 'aaaa' } ] },
        [ '/', '/aa', '/aaaaa' ]
    );

    testRoute(
        '/*[a{3,4}]',
        { '/aaa' : [ 'aaa' ], '/aaaa' : [ 'aaaa' ] },
        [ '/', '/aa', '/aaaaa' ]
    );
});


