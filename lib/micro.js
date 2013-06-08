
var fs       = require('fs'),
    promise  = require('promised-io/promise'),
    sys      = require('sys'),
    proton   = require('proton'),
    spectrum = require('spectrum'),
    url      = require('url');

var errorRenderer = new spectrum.Renderer(fs.realpathSync(__dirname + '/../views'));

var types = {
    'png'  : 'image/png',
    'jpg'  : 'image/jpeg',
    'jpeg' : 'image/jpeg',
    'gif'  : 'image/gif',
    'css'  : 'text/css',
    'js'   : 'text/javascript',
    'swf'  : 'application/x-shockwave-flash',
    'html' : 'text/html'
};

var defaultPlaceholderPattern = '[\\w_-]+';

function quotemeta (input) {
    return input.replace(/([\\\/^$*+?.()|{}\[\]])/g, '\\$1');
}

function makeNamedMatcher (parts) {
    var re    = '',
        names = [];
    for (var i = 0, l = parts.length; i < l; i += 3) {
        re += quotemeta(parts[i]);
        if (i + 1 < l) {
            re += '(' + (typeof(parts[i + 2]) !== 'undefined' ? parts[i + 2] : defaultPlaceholderPattern) + ')';
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
            re += '(' + (typeof(parts[i + 2]) !== 'undefined' ? parts[i + 2] : defaultPlaceholderPattern) + ')';
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
    var realPath  = fs.realpathSync(root),
        realPaths = {},
        Webapp    = this,
        notFound  = function (response) {
            return function (err) {
                response.writeHead(404, { 'Content-Type' : 'text/plain' } );
                response.write('not found');
                response.end();
            };
        };
    Webapp.get(new RegExp('^' + prefix + '(.+\\.(css|js|jpe?g|gif|png|swf|html))$'), function (request, response, next, path, type) {
        var path = realPath + path;
        if (! (path in realPaths)) {
            realPaths[path] = fs.realpathSync(path);
        }
        if (typeof(realPaths[path]) == 'undefined') {
            notFound(response);
            return;
        }
        var content = fs.readFileSync(realPaths[path]);
        if (typeof(content) != 'undefined') {
            response.writeHead(200, {
                'Content-Type' : types[type],
                'Content-Length' : content.length
            });
            response.write(content);
            response.end();
        }
        else {
            notFound(response);
        }
    });
};

function getErrorWriter (response, httpStatus) {
    return function (output) {
        response.writeHead(httpStatus, {
            'Content-Type' : 'text/html',
            'Content-Length' : Buffer.byteLength(output)
        });
        response.write(output);
        response.end();
    };
}

function handleError (err, response) {
    errorRenderer.render('/500.spv', { error: err }).then(getErrorWriter(response, 500));
}

function handleNotFound (request, response, handlers) {
    errorRenderer.render('/404.spv', {}).then(getErrorWriter(response, 404));
}

function route (webapp, request, response, handlers, path, from) {
    if (from > handlers.length) {
        handleNotFound(request, response, handlers);
        return;
    }
    var args,
        next = function () {
            route(webapp, request, response, path, i + 1);
        };
    for (var i = from, l = handlers.length; i < l; i++) {
        if ((handlers[i][0] instanceof RegExp)) {
            if (args = path.match(handlers[i][0])) {
                args.shift();
                args.unshift(next);
                args.unshift(response);
                args.unshift(request);
                handlers[i][1].apply(webapp, args);
            }
        }
        else if (typeof(handlers[i][0]) === 'function' && (args = handlers[i][0].call(request, path))) {
            args.unshift(next);
            args.unshift(response);
            args.unshift(request);
            handlers[i][1].apply(webapp, args);
        }
        else if (handlers[i][0] === path) {
            handlers[i][1].call(webapp, request, response, next);
        }
    }
};


function makeWebapp () {
    var Webapp = function (root) {
        this.webappRoot = root;
        for (var i = 0; i < Webapp._pluginInitFunctions.length; i++) {
            Webapp._pluginInitFunctions[i].call(this);
        }
        if (this.init) {
            this.init.apply(this, arguments);
        }
    };

    Webapp._pluginInitFunctions = [];
    Webapp.addPluginInit = function (init) {
        Webapp._pluginInitFunctions.push(init);
    };

    Webapp.handlers = {
        'GET'    : [],
        'POST'   : [],
        'PUT'    : [],
        'DELETE' : []
    };

    Webapp.get = function (path, handler) {
        Webapp.handlers.GET.push([makeMatcher(path), handler]);
    };

    Webapp.post = function (path, handler) {
        Webapp.handlers.POST.push([makeMatcher(path), handler]);
    };

    Webapp.put = function (path, handler) {
        Webapp.handlers.PUT.push([makeMatcher(path), handler]);
    };

    Webapp.del = function (path, handler) {
        Webapp.handlers.DELETE.push([makeMatcher(path), handler]);
    };
    
    Webapp.handleStatic = handleStatic;

    Webapp.prototype.handle = function (request, response) {
        return route(this, request, response, Webapp.handlers[request.method], url.parse(request.url).pathname, 0);
    };

    Webapp.prototype.internalServerError = function (response, err) {
        console.log('in internal server error', err);
        response.writeHead(500, {
            'Content-Type' : 'text/plain'
        });
        response.write('TODO: improve error in micro.js\n' + err.message);
        response.end();
    };

    Webapp.prototype.parseQueryString = function (request) {
        return url.parse(request.url, true).query;
    };

    return Webapp;
}

exports.webapp = function (plugins) {
    var Webapp = makeWebapp();
    if (plugins) {
        for (var i = 0; i < plugins.length; i++) {
            if (typeof(plugins[i]) != 'function') {
                throw new Error('plugin ' + i + ' passed to webapp is not a function');
            }
            plugins[i](Webapp);
        }
    }
    return Webapp;
};

