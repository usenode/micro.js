
var litmus = require('litmus'),
    micro  = require('../lib/micro');

exports.test = new litmus.Test('Micro Routing', function () {
    var test = this;

    function testRoute (route, shouldMatch, shouldNotMatch) {
        var WebApp = micro.webapp(function () {
            this.get(route, function (request, response) {
                response.ok('text/plain');
                var params = Array.prototype.slice.apply(arguments);
                params.shift();
                params.shift();
                return params;
            });
        });
        function testResponseMatched (response, url, params) {
            var handle = test.async('route: \'' + route + '\', url: \'' + url + '\''),
                check = function (response) {
                    test.ok(response.status === 200, 'route \'' + route + '\' should match \'' + url + '\'');
                    test.is(response.body, [ params ], 'params for route \'' + route + '\' applied to \'' + url + '\'');
                    handle.finish();
                };
            if (response.then) {
                response.then(check);
            }
            else {
                check(response);
            }
        }
        function testResponseDidNotMatch (response, url) {
            var handle = test.async('route: \'' + route + '\', url: \'' + url + '\''),
                check = function (response) {
                    test.ok(response.status === 404, 'route \'' + route + '\' should not match \'' + url + '\'');
                    handle.finish();
                };
            if (response.then) {
                response.then(check);
            }
            else {
                check(response);
            }
        }
        var webapp = new WebApp();
        for (var i in shouldMatch) { 
            testResponseMatched(
                webapp.handle({ method: 'GET', pathInfo: i }),
                i,
                shouldMatch[i]
            );
        }
        for (var i = 0, l = shouldNotMatch.length; i < l; i++) {
            testResponseDidNotMatch(
                webapp.handle({ method: 'GET', pathInfo: shouldNotMatch[i] }),
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


