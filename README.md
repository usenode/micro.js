Introduction
============

Micro.js is a micro webapp framework along the same lines as <a href="http://www.sinatrarb.com/">Sinatra</a>, running on top of <a href="https://github.com/tomyan/proton.js">Proton.js</a>, and hence <a href="http://wiki.commonjs.org/wiki/JSGI/Level0/A/Draft2">JSGI</a> (using <a href="https://github.com/kriszyp/jsgi-node">jsgi-node</a>) and <a href="http://nodejs.org/">Node.js</a> (although there is no reason it couldn't be made to work in other <a href="http://www.commonjs.org/">CommonJS</a> environments).

Usage
=====

Installation
------------

NPM is recommended for development, although for production you might want to find/build a package for your operating system:

    npm install micro

Loading
-------

To load Micro.js:

    var micro = require('micro');

Defining a Web Application
--------------------------

To define a web application, use the <code>micro.webapp</code> factory function to create a web application class (prototype function) suitable for running with <a href="https://github.com/tomyan/proton.js">Proton.js</a>. To add routes and corresponding actions, use the <code>get</code>, <code>post</code>, <code>put</code> and <code>del</code> functions attached to the class (these are not depenent on being invoked on the web application and can safely be assigned to local variables):

    var WebApp = exports.WebApp = micro.webapp(),
        get    = WebApp.get;
    
    get('/', function (request, response) {
        this.ok('text/html');
        return 'hello, world!';
    });

Alternatively, you can pass a function to <code>micro.webapp</code> that is passed the <code>get</code>, <code>post</code>, <code>put</code> and <code>del</code> functions so you can setup your web application class there:

    var WebApp = new micro.webapp(function (get) {
        get('/', function (request, response) {
            response.ok('text/html');
            return 'hello, world!';
        });
    });

These two styles can be mixed, although it is encouraged that a consistent style is adopted.

Each of the methods for creating an action takes a route (see "Routing" below) and callback function for the action to run when the route matches. The action callback takes a request object (see "Request API" below) as the first parameter and the response object (see "Response API" below) as the second parameter. The value of <code>this</code> within the function will be the instance of the web application class.

The expected return value depends on whether the action decides to handle the request or not, which it can choose to do by returning a value that evaluates to true in a boolean context or an empty string (indicating an empty body in the response).

Alternatively the action can return a promise. In this case the action is able to decide whether to handle the request by resolving the promise with a true value (as above) or an empty string, or decline the request by resolving it with null or other value that evaluates to false in a boolean context (excluding the empty string).

Routing
-------

All routes are relative to a root URL that is expressed outside of the webapp (Micro.js webapps can easily be moved to a diffrent URL space).

### Simple Routes

A simple route is just a string that matches the path of the requested URL (e.g. `'/'`).

### Routes with Named Parameters

A route with named parameters contains named placeholder starting with a colon. For example:

    get('/hello/:name', function (request, response, args) {
        response.ok('text/html');
        return 'hello, ' + args.name;
    });

Requests to /hello/tom now result in "hello, tom". By default placeholders will accept any sequence of one or more characters excluding a forward slash, although this can be overridden (see "Validating Parameters for Named and Postional Parameters" below).

### Routes with Positional Parameters

Alternatively you can create placeholders with an asterisk, although you can't mix named and positional placeholder. For example:

    get('/hello/*', function (request, response, name) {
        response.ok('text/html');
        return 'hello, ' + name;
    });

This behaves the same as the example with named parameters above. By default placeholders will accept any sequence of one or more characters excluding a forward slash, although this can be overridden (see "Validating Parameters for Named and Postional Parameters" below).

### Validating Parameters for Named and Positional Parameters

In order to restrict the values that will be accepted by a route, a placeholder can be followed by a fragment of a regular expression contained in round brackets. As the regular expression is specified as part of a string rather than as a regular expression literal, backslashes will have to be in pairs as they would for the parameter to `new RegExp`. For example:

    get('/hello/:name(\\w+)', function (request, response, args) {
        // ...
    });

This works for both named and positional placeholders (e.g. `'/hello/*(\\w+)'` with positional placeholders). 

### RegExp Routes

If the first parameter to get, post, etc. is a regular expression, the corresponding action will be invoked when the regular expression matches the path in the http request. Any captures in the regular expression are passed as arguments to the action callback. For example:

    get(/^\/hello\/(\w+)$/, function (request, response, name) {
        response.ok('text/html');
        return 'hello, ' + name;
    });

This behaves the same as for the previous examples.

### Function Routes

If you've got really complicated requirements for routing, you can pass a function as the route. The function is passed the request path and its invocant (the value of "this" within the function) is the request. The function should return an containing zero or more arguments for the action callback if the route matches. For example:

    get(function (path) {
        if (path === '/foo' && this.queryString === '?a=1') {
            return ['bar'];
        }
    }, function (request, response, baz) {
        // baz contains 'bar' here
    });

Although this feature is supported, it isn't really recommended as it makes the code less readable/maintainable. The recommended practise is to use one of the other routes and put non-path based checks into the action callback, moving onto the next route by returning:

    get('/foo', function (request, response) {
        if (this.queryString !== '?a=1') {
            return;
        }
        // ...
    })

General API Notes
-----------------

Each method without a specified return value will return the object that the method is invoked on, so that methods can be chained (if that's your thing).

WebApp API
----------

The <code>WebApp</code> is the the class created with <code>micro.webapp</code>. When the application is ran (either responding to HTTP requests, or as part of a test suite), an instance of this class is created, which is the value of <code>this</code> within each of the action method, as well as within each method that you attach to the class' prototype. The following helper functions are attached to the WebApp prototype function (class) that add routes and corresponding actions to the class.

* `WebApp.get(route, action)` - add a handler for GET requests.
* `WebApp.post(route, action)` - add a handler for POST requests.
* `WebApp.put(route, action)`  - add a handler for PUT requests.
* `WebApp.del(route, action)` - add a handler for DELETE requests.
* `WebApp.handleStatic(root, prefix)` - add a handler for static assets contained within a directory (<code>root</code>) when requested under a URL prefix.
* `webapp.handle(request)` - called by Proton to handle an incoming request. Could also be useful for testing. Returns a response as specified by <a href="http://wiki.commonjs.org/wiki/JSGI/Level0/A/Draft2">JSGI</a> and expected by Proton (note that this is not the same as the response object that is the invocant to the action callbacks described below in "Response API").

Request API
-----------

The request object passed to each action callback (and the invocant to function routes) is a standard JSGI request object (see <a href="http://wiki.commonjs.org/wiki/JSGI/Level0/A/Draft2">the latest CommonJS proposal for JSGI</a> and <a href="https://github.com/kriszyp/jsgi-node">jsgi-node</a>, which is used by micro.js and proton.js).

Response API
------------

The response object (the invocant to each action callback) has the following methods:

* `this.setStatus(code)` - takes an integer status code and sets it on the response (default 404). See also "Status and Type Shortcuts" below.
* `this.setType(contentType)` - takes a string containing the value for the "Content-Type" of the response (default "text/plain"). See also "Status and Type Shortcuts" below.
* `this.addToBody(content)` - adds content (a string or a file descriptor to read the content from) to the body of the response (can also be achieved by returning the content from the action or resolving a returned promise with the content).

### Status and Type Shortcuts

The following are shortcut methods for settting the status of the response and other header fields that are commonly returned with them (e.g. Content-Type). The most common are "ok", "notFound" and "internalServerError", although if you're an HTTP nut then anything you might want should be here (if it isn't raise a ticket/make a pull request).

TODO - most of these are not implemented yet...

<table>
    <tr>
        <th>Status Code</th>
        <th>Method</th>
        <th>Additional Notes</th>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.1">200 OK</a></td>
        <td><code>response.ok(contentType)</code></td>
        <td>&nbsp;</td>
    </td>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.2">201 Created</a></td>
        <td><code>response.created(contentType, location)</code></td>
        <td>The location parameter contains the URI of the newly created resource.</td>
    </td>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.3">202 Accepted</a></td>
        <td><code>response.accepted(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.4">203 Non-Authoritative Information</a></td>
        <td><code>response.nonAuthoritativeInformation(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.5">204 No Content</a></td>
        <td><code>response.noContent()</code></td>
        <td>There is no content-type parameter as there is not content.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.6">205 Reset Content</a></td>
        <td><code>response.resetContent()</code></td>
        <td>There is no content-type parameter as no response body should be included with this response code.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.7">206 Partial Content</a></td>
        <td><code>response.partialContent(contentType, headers)</code></td>
        <td>The headers parameter must contain keys and values corresponding to the required parameters as specified in <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.7">the spec</a>.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.1">300 Multiple Choices</a></td>
        <td><code>response.multipleChoices(contentType, location?)</code></td>
        <td>The optional location parameter contains the URI of the prefered choice of representation.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.2">301 Moved Permanently</a></td>
        <td><code>response.movedPermanently(location, contentType?)</code></td>
        <td>The location parameter contains the URL being redirected to (this can be relative to the requested URL). The content-type parameter is optional and defaults to text/html. A short message and hyperlink is added to the body if a body is not added.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.3">302 Found</a></td>
        <td><code>response.found(location, contentType?)</code></td>
        <td>The location parameter contains the URL being redirected to (this can be relative to the requested URL). The content-type parameter is optional and defaults to text/html. A short message and hyperlink is added to the body if a body is not added.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.4">303 See Other</a></td>
        <td><code>response.seeOther(location, contentType?)</code></td>
        <td>The location parameter contains the URL being referenced (this can be relative to the requested URL). The content-type parameter is optional and defaults to text/html. A short message is added to the body if a body is not added.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.5">304 Not Modified</a></td>
        <td><code>response.notModified(headers)</code></td>
        <td>The headers parameter must contain keys and values corresponding to the required parameters as specified in <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.5">the spec</a>.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.6">305 Use Proxy</a></td>
        <td><code>response.useProxy(location)</code></td>
        <td>The location parameters should contain the URI of the proxy.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.7">307 Temporary Redirect</a></td>
        <td><code>response.temporaryRedirect(location, contentType?)</code></td>
        <td>The location parameter contains the URL being redirected to (this can be relative to the requested URL). The content-type parameter is optional and defaults to text/html. A short message and hyperlink is added to the body if a body is not added.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.1">400 Bad Request</a></td>
        <td><code>response.badRequest()</code></td>
        <td>This shouldn't normally be called as a malformed request shouldn't make it to the web appliction.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.2">401 Unauthorized</a></td>
        <td><code>response.unauthorized(contentType, wwwAuthenticate)</code></td>
        <td>The wwwAuthenticate parameter should contain the value for the WWW-Authenticate header.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.4">403 Forbidden</a></td>
        <td><code>response.forbidden(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.5">404 Not Found</a></td>
        <td><code>response.notFound(contentType)</code></td>
        <td>&nbsp;</td> 
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.6">405 Method Not Allowed</a></td>
        <td><code>response.methodNotAllowed(contentType, methods)</code></td>
        <td>The methods parameter is an array containing HTTP methods that are allowed for the "Allow" header.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.7">406 Not Acceptable</a></td>
        <td><code>response.notAcceptable(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.8">407 Proxy Authentication Required</a></td>
        <td><code>response.proxyAuthenticationRequired(contentType, proxyAuthentciate)</code></td>
        <td>The proxyAuthenticate parameter contains the value for the "Proxy-Authenticate" header.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.9">408 Request Timeout</a></td>
        <td><code>response.requestTimeout(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.10">409 Conflict</a></td>
        <td><code>response.conflict(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.11">410 Gone</a></td>
        <td><code>response.gone(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.12">411 Length Required</a></td>
        <td><code>response.lengthRequired(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.13">412 Precondition Failed</a></td>
        <td><code>response.preconditionFailed(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.14">413 Request Entity Too Large</a></td>
        <td><code>response.requestEntityTooLarge(contentType, retryAfter?)</code></td>
        <td>The optional retryAfter parameter is for the "Retry-After" parameter in case that the condition is temporary.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.15">414 Request-URI Too Long</a></td>
        <td><code>response.requestURITooLong(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.16">415 Unsupported Media Type</a></td>
        <td><code>response.unsupportedMediaType(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.17">416 Requested Range Not Satisfiable</a></td>
        <td><code>response.requestedRangeNotSatisfiable(contentType, contentRange?)</code></td>
        <td>The optional "contentRange" parameter contains the value for the "Content-Range" header.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.18">417 Expectation Failed</a></td>
        <td><code>response.expectationFailed(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.1">500 Internal Server Error</a></td>
        <td><code>response.internalServerError(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.2">501 Not Implemented</a></td>
        <td><code>response.notImplemented(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.3">502 Bad Gateway</a></td>
        <td><code>response.badGateway(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.4">503 Service Unavailable</a></td>
        <td><code>response.serviceUnavailable(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.5">504 Gateway Timeout</a></td>
        <td><code>response.gatewayTimeout(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.6">505 HTTP Version Not Supported</a></td>
        <td><code>response.httpVersionNotSupport(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
</table>

Views
-----

Pluggable views is an upcoming feature.

Copyright and Licensing
=======================

This code is an alpha quality prototype. It is not recommended for production applications.

Copyright 2010 British Broadcasting Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.




