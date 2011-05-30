/** Net.JS 0.0.1 */
/*!
 * Net.JS
 * Copyright(c) 2011 Oleg Shparber <trollixx@gmail.com>
 * MIT Licensed
 */

/**
 * @namespace
 */
var net = this.net = {

    /**
     * Library version.
     */
    version: '0.0.1',

    /**
     * Applet loading states.
     *
     * @type {Objects}
     * @api private
     */
    _appletState: {
        loaded: false,
        loading: false,
        failed: false
    },

    /**
     * HTMLAppletElement parameters.
     *
     * @type {Object}
     * @api private
     */
    _appletAttributes: {
        'id': 'NetJSApplet',
        'code': 'netjs.NetJSApplet',
        'archive': 'NetJS.jar',
        'mayscript': 'mayscript',
        'style': 'visibility: hidden;',
    },

    /**
     * HTMLAppletElement.
     *
     * @type {Object}
     * @api private
     */
    _applet: {},

    /**
     * Stores net.Socket instances while applet isn't loaded.
     *
     * @type {Array}
     * @api private
     */
    _pendingSockets: [],

    /**
     * Stores net.Socket instances. Object properties are connection
     * IDs in the applet.
     *
     * @type {Object}
     * @api private
     */
    _sockets: {},

    /**
     * Creates net.Server instance
     *
     * @param {Object} options
     * @param {Function} connectionListener
     * @api public
     */
    createServer: function(options, connectionListener) {
        throw new Error('net.Server is not implemented yet!');
    },

    /**
     * Creates net.Socket instance
     *
     * @param {Number} port
     * @param {String} host
     * @api public
     */
    createConnection: function(port, host) {
        var socket = new net.Socket();

        setTimeout(function() {
            if (!net._appletState.loaded) {
                net.loadApplet();
                net._pendingSockets.push([socket, port, host]);
            } else {
                socket.connect(port, host);
            }
        }, 0);

        return socket;
    },

    /**
     * Loads Java applet. Call it directly to preload applet or it will
     * be autoloaded on the first net.Socket.connect call.
     *
     * @api public
     */
    loadApplet: function() {
        if (net._appletState.loaded || net._appletState.loading) {
            console.log('Applet already loaded or loading');
            return;
        }

        net._appletState.loading = true;

        // In case loading previously failed
        net._appletState.failed = false;

        /// TODO: Is this correct for all browsers?
        if (net._applet.tagName !== 'APPLET') {
            net._applet = document.createElement('applet');
            for (var attribute in net._appletAttributes) {
                net._applet.setAttribute(attribute, net._appletAttributes[attribute]);
            }

            /// XXX: Do we need `separate_jvm` and `classloader_cache`?
            var param = document.createElement('param');
            param.setAttribute('name', 'separate_jvm');
            param.setAttribute('value', 'true');
            net._applet.appendChild(param);

            param = document.createElement('param');
            param.setAttribute('name', 'classloader_cache');
            param.setAttribute('value', 'false');
            net._applet.appendChild(param);
        }

        document.body.appendChild(net._applet);

        // FIXME: Maybe there's better way to determine user's refuse of applet running
        setTimeout(net._appletLoadFailed, 30000);
    },

    /**
     * Called by timeout on applet load.
     *
     * @api private
     */
    _appletLoadFailed: function() {
        if (!net._appletState.loaded) {
            console.log('Applet loading failed');
            net._appletState.failed = true;
            net._appletState.loading = false;
            document.body.removeChild(net._applet);

            for (var i in net._pendingSockets) {
                setTimeout(function() {
                    net._pendingSockets[i][0].emit.apply(net._pendingSockets[i][0], ['error', new Error('Applet loading failed')]);
                });
            }
        }
    },

    /**
     * Called by Java applet when it is loaded and started.
     *
     * @api private
     */
    _appletLoaded: function() {
        net._appletState.loaded = true;
        net._appletState.loading = false;

        for (var i in net._pendingSockets) {
            setTimeout(function() {
                net._pendingSockets[i][0].connect.apply(net._pendingSockets[i][0], [net._pendingSockets[i][1], net._pendingSockets[i][2]]);
            });
        }
    },

    /**
     * Allows Java applet to emit events in net.Socket instances.
     * XXX: Maybe applet should operate with _sockets directly?
     *
     * @param {Number} id net.Socket instance ID
     * @param {String} event Event name
     * @api private
     */
    _emit: function(id, event) {
        console.log("net._emit");
        console.log(arguments);

        /// XXX: Maybe 'in' should be used instead of Object.hasOwnProperty?
        if (net._sockets.hasOwnProperty(id)) {
            var args = arguments;
            var instance = net._sockets[id];

            /// XXX: Don't like it. Want to remove `event` param.
            // Create Exception from String
            if (event === 'error' && args[2]) {
                args[2] = new Error(args[2]);
            }

            setTimeout(function() {
                instance.emit.apply(instance, Array.prototype.slice.call(args, 1));
            }, 0);
        }
    }
};

/**
 * Expose NetJS in jQuery
 */
if ('jQuery' in this) jQuery.net = this.net;


(function() {
    var net = this.net;

    /**
     * Set when the `onload` event is executed on the page. This variable is used by
     * `net.util.load` to detect if we need to execute the function immediately or add
     * it to a onload listener.
     *
     * @type {Boolean}
     * @api private
     */
    pageLoaded = false;

    /**
     * @namespace
     */
    net.util = {
        /**
         * Executes the given function when the page is loaded.
         *
         * Example:
         *
         *     net.util.load(function(){ console.log('page loaded') });
         *
         * @param {Function} fn
         * @api public
         */
        load: function(fn) {
            if (/loaded|complete/.test(document.readyState) || pageLoaded) return fn();
            if ('attachEvent' in window){
                window.attachEvent('onload', fn);
            } else {
                window.addEventListener('load', fn, false);
            }
        }
    };

    net.util.load(function() {
        pageLoaded = true;
    });
})();

/**
 * Simple EventEmitter implementation
 */
(function() {
    var util = this.net.util;

    var EventEmitter = util.EventEmitter = function() {
        this._listeners = {};
    }

    /**
     * Adds a listener to the end of the listeners array for the specified event.
     *
     * @param {String} event
     * @param {Function} listener
     * @api public
     */
    EventEmitter.prototype.addListener =
    EventEmitter.prototype.on = function(event, listener) {
        /// FIXME: Is this our problem?
        if (typeof listener !== 'function') {
            throw new Error('Listener is not a function');
        }

        if (!this._listeners.hasOwnProperty(event)) {
            this._listeners[event] = [];
        }

        this._listeners[event].push(listener);
    };

    /**
     * Execute each of the listeners in order with the supplied
     * arguments.
     *
     * @param {String} event
     * @api public
     */
    EventEmitter.prototype.emit = function(event) {
        console.log('>>> emit: event=' + event);
        if (this._listeners.hasOwnProperty(event)) {
            var self = this;
            var args = arguments;

            for (var i in this._listeners[event]) {
                setTimeout(function() {
                    self._listeners[event][i].apply(self, Array.prototype.slice.call(args, 1));
                }, 0);
            }
        }
    };
})();

(function() {
    var net = this.net;

    /**
     * Construct a new socket object.
     * TODO: @param options
     *
     * @api public
     */
    var Socket = net.Socket = function() {
        this._id = 0;
        this.port = '';
        this.host = '';
    };

    // Inheriting EventEmitter
    Socket.prototype = new net.util.EventEmitter();

    /**
     * Opens the connection for a given socket. If `port` and `host` are
     * given, then the socket will be opened as a TCP socket, if `host`
     * is omitted, server hostname or 'localhost' will be assumed.
     *
     * Normally this method is not needed, as net.createConnection
     * opens the socket. Use this only if you are implementing a
     * custom Socket or if a Socket is closed and you want to reuse
     * it to connect to another server.
     *
     * This function is asynchronous. When the 'connect' event is
     * emitted the socket is established. If there is a problem
     * connecting, the 'connect' event will not be emitted, the 'error'
     *  event will be emitted with the exception.
     *
     * The callback parameter will be added as an listener for the
     * 'connect' event.
     *
     * TODO: Local sockets: socket.connect(path, [callback])
     *
     * @param {Number} port
     * @param {String} host
     * @param {Function} callback
     * @api public
     */
    Socket.prototype.connect = function(port, host, callback) {
        this.port = port || '80';

        /// XXX: This was needed for IcedTea
        /*if (typeof this.port === 'number') {
            this.port = this.port.toString();
        }*/

        this.host = host || (window.location.hostname === '' ? 'localhost' : window.location.hostname);

        if (callback) {
            this.on('connect', callback);
        }

        this._id = net._applet.connect(this.host, this.port);
        net._sockets[this._id] = this;
    };

    /// TODO: call callback when the data is finally written out
    // (internal events?)
    Socket.prototype.write = function(data, callback) {
        console.log('>>> write ' + data);
        /// XXX: IcedTea handles only JS's String as Java's int

        console.log(typeof data);
        switch (typeof data) {
            case 'string':
                console.log('string');
                return net._applet.writeString(this._id, data);
            case 'number':
                console.log('number');
                return net._applet.writeNumber(this._id, data);
            default:
                return net._applet.write(this._id, data);
        }
    };
})();
