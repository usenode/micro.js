
var fs       = require('promised-io/fs'),
    promise  = require('promised-io/promise'),
    sys      = require('sys'),
    proton   = require('proton'),
    spectrum = require('spectrum');

var getRenderer = fs.realpath(__dirname + '/../views').then(function (path) {
    return new spectrum.Renderer(path);
});

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

Response.prototype.notFound = function (type) {
    this.setStatus(404);
    this.setType(type);
};

Response.prototype.redirect = function (to, permanent) {
    this.setStatus(permanent ? 301 : 302);
    this._response.headers['Location'] = to;
};

Response.prototype.internalServerError = function (type) {
    this.setStatus(500);
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

Response.prototype.render = function (path, args, contentType, status) {
    if (! this.webapp.view) {
        throw new Error('you must set a view property on the webapp to call response.render');
    }
    if (! contentType) {
        contentType = 'text/html';
    }
    var response = this;
    return this.webapp.view.render(path, args).then(function(output) {
        response.setStatus(status);
        response.setType(contentType);
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

function handleStatic (root, prefix) {
    if (! root) {
        throw new Error('missing root directory for static files');
    }
    if (! prefix) {
        prefix = '';
    }
    prefix = prefix.replace(/([^\w])/g, '\\$1');
    var realRoot  = fs.realpath(root),
        realPaths = {},
        WebApp    = this,
        notFound  = function (response) {
            return function (err) {
                response.notFound('text/plain');
                return 'not found';
            };
        };
    proton.beforeStart(WebApp, realRoot.then(
        function (root) {
            WebApp.get(new RegExp('^' + prefix + '(.+\\.(css|js|jpe?g|gif|png|swf|spv))$'), function (request, response, path, type) {
                var path = root + path;
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
                            notFound(response)
                        );
                    },
                    notFound(response)
                );
            });
        },
        function (err) {
            throw new Error('TODO handle cannot find real root: ' + err);
        }
    ));
};

function handlePublicTemplates (ext, callback) {
    this.get(/^((?:\/[\w-]+)+)\/$/, function (request, response, path) {
        return response.redirect(path, true);
    });

    this.get(/^(?:(\/)|((?:\/[\w-]+)+))$/, function (request, response, index, path) {
        if (path && path === '/index') {
            return response.redirect('/', true);
        }
        var templatePath = (index ? '/index' : path) + ext,
            view         = this.view;
        return this.view.loadTemplate(templatePath).then(function (template) {
            return callback(request, response, template);
        }, function (e) {
            if (e) {
                throw e;
            }
            return null;
        });
    });
}

function handleError (err, response) {
    return getRenderer.then(function (renderer) {
        return renderer.render('/500.spv', { error: err }).then(function (output) {
            response.internalServerError('text/html');
            response.addToBody(output);
        });
    });
}

function handleNotFound (request, response, handlers) {
    return getRenderer.then(function (renderer) {
        return renderer.render('/404.spv', {}).then(function (output) {
            response.notFound('text/html');
            response.addToBody(output);
        });
    });
}

function route (webapp, request, response, handlers, from) {
    var body,
        args
    for (var i = from, l = handlers.length; i < l; i++) {
        if ((handlers[i][0] instanceof RegExp)) {
            if (args = request.pathInfo.match(handlers[i][0])) {
                args.shift();
                args.unshift(response);
                args.unshift(request);
                body = handlers[i][1].apply(webapp, args);
            }
        }
        else if (typeof(handlers[i][0]) === 'function' && (args = handlers[i][0].call(request, request.pathInfo))) {
            args.unshift(response);
            args.unshift(request);
            body = handlers[i][1].apply(webapp, args);
        }
        else if (handlers[i][0] === request.pathInfo) {
            body = handlers[i][1].call(webapp, request, response);
        }
        if (body && body.then) {
            return body.then(function (body) {
                if (typeof(body) === 'undefined' || body === null) {
                    return route(webapp, request, response, handlers, i + 1);
                }
                response.addToBody(body);
            }, function (err) {
//                // TODO - perhaps allow fall through to next route?
                return handleError(err, response);
            }).then(function () {
                return response._response;
            });
        }
        else if (response._handled) {
            response.addToBody(body);
            return response._response;
        }
    }
    return handleNotFound(request, response, handlers).then(function () {
        return response._response;
    });
};


function makeWebApp () {
    var WebApp = function () {
        if (this.init) {
            this.init.apply(this, arguments);
        }
    };

    WebApp.handlers = {
        'GET'    : [],
        'POST'   : [],
        'PUT'    : [],
        'DELETE' : []
    };

    WebApp.get = function (path, handler) {
        WebApp.handlers.GET.push([makeMatcher(path), handler]);
    };

    WebApp.post = function (path, handler) {
        WebApp.handlers.POST.push([makeMatcher(path), handler]);
    };

    WebApp.put = function (path, handler) {
        WebApp.handlers.PUT.push([makeMatcher(path), handler]);
    };

    WebApp.del = function (path, handler) {
        WebApp.handlers.DELETE.push([makeMatcher(path), handler]);
    };
    
    WebApp.handleStatic = handleStatic;

    WebApp.handlePublicTemplates = handlePublicTemplates;

    WebApp.prototype.handle = function (request) {
        return route(this, request, new Response(this), WebApp.handlers[request.method], 0);
    };

    return WebApp;
}

exports.webapp = function (setup) {
    var WebApp = makeWebApp();
    if (setup) {
        setup.call(WebApp, WebApp.get, WebApp.post, WebApp.put, WebApp.del);
    }
    return WebApp;
};

