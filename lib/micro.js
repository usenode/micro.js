
pkg.define('micro', ['node:http', 'promise', 'fs-promise', 'node:sys'], function (http, promise, fs, sys) {
    var ns = {};

    var types = {
        'png'  : 'image/png',
        'jpg'  : 'image/jpeg',
        'jpeg' : 'image/jpeg',
        'gif'  : 'image/gif',
        'css'  : 'text/css',
        'js'   : 'text/javascript',
        'spv'  : 'text/spectrum-view'
    };

    var WebApp = ns.WebApp = function (setup) {
        this.handlers = {
            'GET'    : [],
            'POST'   : [],
            'PUT'    : [],
            'DELETE' : []
        };
        var webapp = this;
        setup.call(
            this,
            function () { return webapp.get.apply(webapp, arguments); },
            function () { return webapp.post.apply(webapp, arguments); },
            function () { return webapp.put.apply(webapp, arguments); },
            function () { return webapp.del.apply(webapp, arguments); }
        );
    };

    WebApp.prototype.get = function (path, handler, invocant) {
        if (! invocant) {
            invocant = this;
        }
        this.handlers.GET.push([path, handler, invocant]);
    };

    WebApp.prototype.post = function (path, handler, invocant) {
        if (! invocant) {
            invocant = this;
        }
        this.handlers.POST.push([path, handler, invocant]);
    };

    WebApp.prototype.put = function (path, handler, invocant) {
        if (! invocant) {
            invocant = this;
        }
        this.handlers.PUT.push([path, handler, invocant]);
    };

    WebApp.prototype.del = function (path, handler, invocant) {
        if (! invocant) {
            invocant = this;
        }
        this.handlers.DELETE.push([path, handler, invocant]);
    };

    WebApp.prototype.handleStatic = function (root, prefix) {
        if (! prefix) {
            prefix = '';
        }
        prefix = prefix.replace(/([^\w])/g, '\\$1');
        var realRoot = fs.realpath(root),
            realPaths = {};
        this.handlers.GET.push([new RegExp('^' + prefix + '(.+\\.(css|js|jpe?g|gif|png|spv))$'), function (request, response, path, type) {
            var path = root + path;
            if (! (path in realPaths)) {
                realPaths[path] = fs.realpath(path);
            }
            promise.all(realRoot, realPaths[path]).then(function (paths) {
                if (typeof(paths[1]) === 'object') {
                    if (paths[1].message.indexOf('ENOENT') != -1) {
                        response.sendHeader(404, { 'Content-Type': 'text/plain' });
                        response.write('TODO fall through to next handler');
                        response.end();
                    }
                    else {
                        response.sendHeader(500, { 'Content-Type': 'text/plain' });
                        response.write('TODO render fancy message, which should be configurable');
                        response.end();
                    }
                }
                // TODO make this kind of thing work with symlinks
/*                else if (paths[1].indexOf(paths[0]) !== 0) {
                    response.sendHeader(404, { 'Content-Type': 'text/plain' });
                    response.write('TODO should this be forbidden - resulting path is outside of static root');
                    response.end();                    
                }
*/
                else {
                    fs.readFile(paths[1]).then(function (contents) {
                        response.sendHeader(200, { 'Content-Type': types[type] });
                        response.write(contents);
                        response.end();
                    });
                }
            });
        }, this]);
    };

    WebApp.prototype.handle = function (request, response) {
        var handlers = this.handlers[request.method],
            args,
            handled = false;
        for (var i = 0, l = handlers.length; i < l; i++) {
            if ((handlers[i][0] instanceof RegExp) && (args = request.url.match(handlers[i][0]))) {
                args.unshift(request);
                args[1] = response;
                handlers[i][1].apply(handlers[i][2], args);
                handled = true;
                break;
            }
            else if (handlers[i][0] === request.url) {
                handlers[i][1].call(handlers[i][2], request, response);
                handled = true;
                break;
            }
        }
        if (! handled) {
            response.sendHeader(404, {'Content-Type': 'text/plain'});
            response.write('Resource Not Found');
            response.end();
        }
    };

    WebApp.prototype.run = function (port, bindTo) {
        var webapp = this;
        this.server = http.createServer(function(request, response) {
            webapp.handle(request, response);
        });
        this.server.listen(port, bindTo);
    };

    return ns;
});