Introduction
============

Micro.js is a micro webapp framework along the same lines as <a href="http://www.sinatrarb.com/">Sinatra</a>, running on top of <a href="https://github.com/tomyan/proton.js">Proton.js</a>, and hence <a href="http://wiki.commonjs.org/wiki/JSGI/Level0/A/Draft2">JSGI</a> (using <a href="https://github.com/kriszyp/jsgi-node">jsgi-node</a>) and <a href="http://nodejs.org/">Node.js</a> (although there is no reason it couldn't be made to work in other <a href="http://www.commonjs.org/">CommonJS</a> environments).

Usage
=====

Installation
------------

NPM is recommended for development, although for production you might want to find/build a package for your operating system:

    npm install micro

(TODO does not work yet)

Loading
-------

To load Micro.js:

    var micro = require('micro/micro');

Defining a Web Application
--------------------------

To define a web application create a new micro.WebApp, passing a function that sets up the routes and corresponding actions:

    var webapp = new micro.WebApp(function (get) {
        get('/', function (request) {
            this.ok('text/html');
            return 'hello, world!';
        });
    });

An alternative way to define a web application that avoids function nesting at the expense of slightly more verbose method calls for adding routes and corresponding actions, is to add the routes and actions to the web application object after it is created:

    var webapp = new micro.WebApp();
    
    webapp.get('/', function (request) {
        this.ok('text/html');
        return 'hello, world!';
    });

These two styles can be mixed, although it is encouraged that a consistent style is adopted.

The function that is passed to the micro.WebApp constructor takes four parameters:

* `get`  - add a route and corresponding action for GET requests.
* `post` - add a route and corresponding action for POST requests.
* `put`  - add a route and corresponding action for PUT requests.
* `del`  - add a route and corresponding action for DELETE requests (don't use "delete" as the name for this parameter as it is a reserved word in JavaScript).

Each of these is a shortcut for calling this.get, this.post, etc. This ensures that actions are registered on the webapp itself rather than statically. Each of the methods for creating an action takes a route (see "Routing" below) and callback function for the action to run when the route matches. The action callback takes a request object (see "Request API" below) as the first parameter and the invocant (i.e. the value of "this" within the function) is an object representing the response.

The expected return value depends on whether the action decides to handle the request or not, which it can choose to do by returning a value that evaluates to true in a boolean context or an empty string (indicating an empty body in the response).

Alternatively the action can return a promise. In this case the action is able to decide whether to handle the request by resolving the promise with a true value (as above) or an empty string, or decline the request by resolving it with null or other value that evaluates to false in a boolean context (excluding the empty string).

Routing
-------

All routes are relative to a root URL that is expressed outside of the webapp (Micro.js webapps can easily be moved to a diffrent URL space).

### Simple Routes

A simple route is just a string that matches the path of the requested URL (e.g. `'/'`).

### Routes with Named Parameters

A route with named parameters contains named placeholder starting with a colon. For example:

    get('/hello/:name', function (request, args) {
        this.ok('text/html');
        return 'hello, ' + args.name;
    });

Requests to /hello/tom now result in "hello, tom". By default placeholders will accept any sequence of one or more characters excluding a forward slash, although this can be overridden (see "Validating Parameters for Named and Postional Parameters" below).

### Routes with Positional Parameters

Alternatively you can create placeholders with an asterisk, although you can't mix named and positional placeholder. For example:

    get('/hello/*', function (request, name) {
        this.ok('text/html');
        return 'hello, ' + name;
    });

This behaves the same as the example with named parameters above. By default placeholders will accept any sequence of one or more characters excluding a forward slash, although this can be overridden (see "Validating Parameters for Named and Postional Parameters" below).

### Validating Parameters for Named and Positional Parameters

In order to restrict the values that will be accepted by a route, a placeholder can be followed by a fragment of a regular expression contained in round brackets. As the regular expression is specified as part of a string rather than as a regular expression literal, backslashes will have to be in pairs as they would for the parameter to `new RegExp`. For example:

    get('/hello/:name(\\w+)', function (request, args) {
        // ...
    });

This works for both named and positional placeholders (e.g. `'/hello/*(\\w+)'` with positional placeholders). 

### RegExp Routes

If the first parameter to get, post, etc. is a regular expression, the corresponding action will be invoked when the regular expression matches the path in the http request. Any captures in the regular expression are passed as arguments to the action callback. For example:

    get(/^\/hello\/(\w+)$/, function (request, name) {
        this.ok('text/html');
        return 'hello, ' + name;
    });

This behaves the same as for the previous examples.

### Function Routes

If you've got really complicated requirements for routing, you can pass a function as the route. The function is passed the request path and its invocant (the value of "this" within the function) is the request. The function should return an containing zero or more arguments for the action callback if the route matches. For example:

    get(function (path) {
        if (path === '/foo' && this.queryString === '?a=1') {
            return ['bar'];
        }
    }, function (request, baz) {
        // baz contains 'bar' here
    });

Although this feature is supported, it isn't really recommended as it makes the code less readable/maintainable. The recommended practise is to use one of the other routes and put non-path based checks into the action callback, moving onto the next route by returning:

    get('/foo', function (request) {
        if (this.queryString !== '?a=1') {
            return;
        }
        // ...
    })

General API Notes
-----------------

Each method without a specified return value return the object that the method is invoked on so that they can be chained (if that's your thing).

WebApp API
----------

The webapp is the the object created with "new micro.WebApp()" as well as the invocant (the value of `this`) within the function passed to `new micro.WebApp()`. The following methods are supported on the webapp object:

* `webapp.get(route, action)`  - as described above
* `webapp.post(route, action)` - as described above
* `webapp.put(route, action)`  - as described above
* `webapp.del(route, action)`  - as described above
* `webapp.handleStatic(root, prefix)` - causes a directory containing static assets (root) to be served under a url prefix.
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

<table>
    <tr>
        <th>Status Code</th>
        <th>Method</th>
        <th>Additional Notes</th>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.1">200 OK</a></td>
        <td><code>this.ok(contentType)</code></td>
        <td>&nbsp;</td>
    </td>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.2">201 Created</a></td>
        <td><code>this.created(contentType, location)</code></td>
        <td>The location parameter contains the URI of the newly created resource.</td>
    </td>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.3">202 Accepted</a></td>
        <td><code>this.accepted(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.4">203 Non-Authoritative Information</a></td>
        <td><code>this.nonAuthoritativeInformation(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.5">204 No Content</a></td>
        <td><code>this.noContent()</code></td>
        <td>There is no content-type parameter as there is not content.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.6">205 Reset Content</a></td>
        <td><code>this.resetContent()</code></td>
        <td>There is no content-type parameter as no response body should be included with this response code.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.7">206 Partial Content</a></td>
        <td><code>this.partialContent(contentType, headers)</code></td>
        <td>The headers parameter must contain keys and values corresponding to the required parameters as specified in <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.7">the spec</a>.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.1">300 Multiple Choices</a></td>
        <td><code>this.multipleChoices(contentType, location?)</code></td>
        <td>The optional location parameter contains the URI of the prefered choice of representation.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.2">301 Moved Permanently</a></td>
        <td><code>this.movedPermanently(location, contentType?)</code></td>
        <td>The location parameter contains the URL being redirected to (this can be relative to the requested URL). The content-type parameter is optional and defaults to text/html. A short message and hyperlink is added to the body if a body is not added.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.3">302 Found</a></td>
        <td><code>this.found(location, contentType?)</code></td>
        <td>The location parameter contains the URL being redirected to (this can be relative to the requested URL). The content-type parameter is optional and defaults to text/html. A short message and hyperlink is added to the body if a body is not added.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.4">303 See Other</a></td>
        <td><code>this.seeOther(location, contentType?)</code></td>
        <td>The location parameter contains the URL being referenced (this can be relative to the requested URL). The content-type parameter is optional and defaults to text/html. A short message is added to the body if a body is not added.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.5">304 Not Modified</a></td>
        <td><code>this.notModified(headers)</code></td>
        <td>The headers parameter must contain keys and values corresponding to the required parameters as specified in <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.5">the spec</a>.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.6">305 Use Proxy</a></td>
        <td><code>this.useProxy(location)</code></td>
        <td>The location parameters should contain the URI of the proxy.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.7">307 Temporary Redirect</a></td>
        <td><code>this.temporaryRedirect(location, contentType?)</code></td>
        <td>The location parameter contains the URL being redirected to (this can be relative to the requested URL). The content-type parameter is optional and defaults to text/html. A short message and hyperlink is added to the body if a body is not added.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.1">400 Bad Request</a></td>
        <td><code>this.badRequest()</code></td>
        <td>This shouldn't normally be called as a malformed request shouldn't make it to the web appliction.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.2">401 Unauthorized</a></td>
        <td><code>this.unauthorized(contentType, wwwAuthenticate)</code></td>
        <td>The wwwAuthenticate parameter should contain the value for the WWW-Authenticate header.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.4">403 Forbidden</a></td>
        <td><code>this.forbidden(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.5">404 Not Found</a></td>
        <td><code>this.notFound(contentType)</code></td>
        <td>&nbsp;</td> 
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.6">405 Method Not Allowed</a></td>
        <td><code>this.methodNotAllowed(contentType, methods)</code></td>
        <td>The methods parameter is an array containing HTTP methods that are allowed for the "Allow" header.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.7">406 Not Acceptable</a></td>
        <td><code>this.notAcceptable(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.8">407 Proxy Authentication Required</a></td>
        <td><code>this.proxyAuthenticationRequired(contentType, proxyAuthentciate)</code></td>
        <td>The proxyAuthenticate parameter contains the value for the "Proxy-Authenticate" header.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.9">408 Request Timeout</a></td>
        <td><code>this.requestTimeout(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.10">409 Conflict</a></td>
        <td><code>this.conflict(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.11">410 Gone</a></td>
        <td><code>this.gone(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.12">411 Length Required</a></td>
        <td><code>this.lengthRequired(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.13">412 Precondition Failed</a></td>
        <td><code>this.preconditionFailed(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.14">413 Request Entity Too Large</a></td>
        <td><code>this.requestEntityTooLarge(contentType, retryAfter?)</code></td>
        <td>The optional retryAfter parameter is for the "Retry-After" parameter in case that the condition is temporary.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.15">414 Request-URI Too Long</a></td>
        <td><code>this.requestURITooLong(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.16">415 Unsupported Media Type</a></td>
        <td><code>this.unsupportedMediaType(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.17">416 Requested Range Not Satisfiable</a></td>
        <td><code>this.requestedRangeNotSatisfiable(contentType, contentRange?)</code></td>
        <td>The optional "contentRange" parameter contains the value for the "Content-Range" header.</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.18">417 Expectation Failed</a></td>
        <td><code>this.expectationFailed(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.1">500 Internal Server Error</a></td>
        <td><code>this.internalServerError(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.2">501 Not Implemented</a></td>
        <td><code>this.notImplemented(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.3">502 Bad Gateway</a></td>
        <td><code>this.badGateway(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.4">503 Service Unavailable</a></td>
        <td><code>this.serviceUnavailable(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.5">504 Gateway Timeout</a></td>
        <td><code>this.gatewayTimeout(contentType)</code></td>
        <td>&nbsp;</td>
    </tr>
    <tr>
        <td><a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.6">505 HTTP Version Not Supported</a></td>
        <td><code>this.httpVersionNotSupport(contentType)</code></td>
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




