
var fs       = require('promised-io/fs'),
    promise  = require('promised-io/promise'),
    sys      = require('sys'),
    proton   = require('proton');
//    Spectrum = ;

var types = {
    'png'  : 'image/png',
    'jpg'  : 'image/jpeg',
    'jpeg' : 'image/jpeg',
    'gif'  : 'image/gif',
    'css'  : 'text/css',
    'js'   : 'text/javascript',
    'swf'  : 'application/x-shockwave-flash'
};

var Response = function (webapp) {
    this.webapp = webapp;
    this._response = {
        status: 404,
        headers: { 'Content-Type' : 'text/plain' }
    };
    this._handled = false;
};

Response.prototype.setStatus = function (status) {
    this._response.status = status;
    this._handled = true;
};

Response.prototype.setType = function (type) {
    this._response.headers['Content-Type'] = type;
};

Response.prototype.ok = function (type) {
    this.setStatus(200);
    this.setType(type);
};

Response.prototype.addToBody = function (body) {
    if (this._response.body) {
        this._response.body.push(body);
    }
    else {
        this._response.body = [body];
    }
};

Response.prototype.render = function (path, args, contentType) {
    if (! this.webapp.view) {
        throw new Error('you must set a view property on the webapp to call response.render');
    }
    if (! contentType) {
        contentType = 'text/html';
    }
    var response = this;
    return this.webapp.view.render(path, args).then(function(output) {
        response.ok(contentType);
        return output;
    });
};

function quotemeta (input) {
    return input.replace(/([\\\/^$*+?.()|{}\[\]])/g, '\\$1');
}

function makeNamedMatcher (parts) {
    var re    = '',
        names = [];
    for (var i = 0, l = parts.length; i < l; i += 3) {
        re += quotemeta(parts[i]);
        if (i + 1 < l) {
            re += '(' + (typeof(parts[i + 2]) !== 'undefined' ? parts[i + 2] : '[^\\/]+') + ')';
            names.push(parts[i + 1]);
        }
    }
    var regex = new RegExp('^' + re + '$');
    return function (path) {
        var match = path.match(regex);
        if (match) {
            var vals = {};
            for (var i = 0, l = names.length; i < l; i++) {
                vals[names[i]] = match[i + 1];
            }
            return [vals];
        }
    };
}

function makePositionalMatcher (parts) {
    var re      = '',
        matches = 0;
    for (var i = 0, l = parts.length; i < l; i += 3) {
        re += quotemeta(parts[i]);
        if (i + 1 < l) {
            re += quotemeta(parts[i + 1]);
            matches++;
            re += '(' + (typeof(parts[i + 2]) !== 'undefined' ? parts[i + 2] : '[^\\/]+') + ')';
        }
    }
    var regex = new RegExp('^' + re + '$');
    return function (path) {
        var match = path.match(regex);
        if (match) {
            var vals = [];
            for (var i = 0; i < matches; i++) {
                vals.push(match[i + 1]);
            }
            return vals;
        }
    };
}

var namedPattern = /:(\w+)(?:\[((?:[^\[\]]|\[(?:[^\]]|\\])+?\])+?)\])?/,
    positionalPattern = /(^|\/)\*(?:\[((?:[^\[\]]|\[(?:[^\]]|\\])+?\])+?)\])?(?:$|(?=\/))/;

function makeMatcher (route) {
    if (route instanceof RegExp || typeof(route) === 'function') {
        return route;
    }
    var named = route.split(namedPattern),
        positional = route.split(positionalPattern);
    if (named.length > 1 && positional.length > 1) {
        throw new Error('cannot have route with both named (:name) and positional (*) parameters ("' + route + '")');
    }
    else if (named.length > 1) {
        return makeNamedMatcher(named);
    }
    else if (positional.length > 1) {
        return makePositionalMatcher(positional);
    }
    return route;
}

var WebApp = proton.framework(function (setup) {
    this.handlers = {
        'GET'    : [],
        'POST'   : [],
        'PUT'    : [],
        'DELETE' : []
    };
//    this.io = io.listen(this.server);

    var webapp = this;
    setup.call(
        this,
        function () { return webapp.get.apply(webapp, arguments); },
        function () { return webapp.post.apply(webapp, arguments); },
        function () { return webapp.put.apply(webapp, arguments); },
        function () { return webapp.del.apply(webapp, arguments); }
    );
});

WebApp.prototype.get = function (path, handler) {
    this.handlers.GET.push([makeMatcher(path), handler]);
};

WebApp.prototype.post = function (path, handler) {
    this.handlers.POST.push([makeMatcher(path), handler]);
};

WebApp.prototype.put = function (path, handler) {
    this.handlers.PUT.push([makeMatcher(path), handler]);
};

WebApp.prototype.del = function (path, handler) {
    this.handlers.DELETE.push([makeMatcher(path), handler]);
};

WebApp.prototype.handleStatic = function (root, prefix) {
    if (! root) {
        throw new Error('missing root directory for static files');
    }
    if (! prefix) {
        prefix = '';
    }
    prefix = prefix.replace(/([^\w])/g, '\\$1');
    var realRoot  = fs.realpath(root),
        realPaths = {},
        webapp    = this,
        notFound  = function (err) {
            response.setStatus(404);
            response.setType('text/plain');
            return 'not found';
        };
    this.context.beforeStart(realRoot.then(
        function (root) {
            webapp.get(new RegExp('^' + prefix + '(.+\\.(css|js|jpe?g|gif|png|swf|spv))$'), function (request, path, type) {
                var path = root + path,
                    response = this;
                if (! (path in realPaths)) {
                    realPaths[path] = fs.realpath(path);
                }
                return realPaths[path].then(
                    function (assetPath) {
                        return fs.readFile(assetPath).then(
                            function (contents) {
                                response.setStatus(200);
                                response.setType(types[type]);
                                return contents;
                            },
                            notFound
                        );
                    },
                    notFound
                );
            });
        },
        function (err) {
            throw new Error('TODO handle cannot find real root: ' + err);
        }
    ));
};

WebApp.prototype._handleNotFound = function (request, response, handlers) {
    response.setStatus(404);
    response.setType('text/plain');
    return ['not found'];
};

WebApp.prototype._route = function (request, response, handlers, from) {
    var body,
        args,
        webapp = this;
    for (var i = from, l = handlers.length; i < l; i++) {
        if ((handlers[i][0] instanceof RegExp)) {
            if (args = request.pathInfo.match(handlers[i][0])) {
                args.shift();
                args.unshift(request);
                body = handlers[i][1].apply(response, args);
            }
        }
        else if (typeof(handlers[i][0]) === 'function' && (args = handlers[i][0].call(request, request.pathInfo))) {
            args.unshift(request);
            body = handlers[i][1].apply(response, args);
        }
        else if (handlers[i][0] === request.pathInfo) {
            body = handlers[i][1].call(response, request);
        }
        if (body && body.then) {
            return body.then(function (body) {
                if (typeof(body) === 'undefined') {
                    // TODO call dedicated error handler
                    throw new Error('value of resolved promise is undefined');
                }
                response.addToBody(body);
                return response._response;
            }, function () {
                // TODO call dedicated error handler, depending what value the promise was rejected with
                return webapp._route(handlers, request, response, i + 1);
            });
        }
        else if (response._handled) {
            response.addToBody(body);
            return response._response;
        }
    }
    this._handleNotFound(request, response, handlers);
    return response._response;
};

// TODO add dedicated error handler

WebApp.prototype.handle = function (request) {
    return this._route(request, new Response(this), this.handlers[request.method], 0);
};

exports.webapp = function (setup) {
    return function () {
        return new WebApp(setup);
    };
};

