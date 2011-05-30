/*!
 * Net.JS - Echo Client Example
 * Copyright(c) 2011 Oleg Shparber <trollixx@gmail.com>
 * MIT Licensed
 */

var socket = {};

/**
 * Loads Net.JS
 *
 * @api public
 */
function load() {
    // Not needed it real world
    net._appletAttributes.archive = '../../applet/dist/NetJS.jar';

    socket = net.createConnection(8124);
    socket.on('connect', function() {
        var text = document.getElementById('send').removeAttribute('disabled');
    });

    socket.on('data', function(data) {
        document.getElementById('reply_text').value = data;
    });

    socket.on('close', function() {
        document.getElementById('send').setAttribute('disabled', 'disabled');
        document.getElementById('reply_text').value = '<Connection closed>';
    });
}

/**
 * Sends data through Net.JS
 *
 * @api public
 */
function send() {
    var text = document.getElementById('send_text').value;
    if (text.length) {
        socket.write(text);
    }
}
