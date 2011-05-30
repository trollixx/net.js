#!/usr/bin/env node

/*!
 * Net.JS - Simple Echo Server
 * Copyright(c) 2011 Oleg Shparber <trollixx@gmail.com>
 * MIT Licensed
 */

var net = require('net');

var server = net.createServer(function (socket) {
    console.log('[connect]');

    socket.on('data', function(data) {
        console.log('[data] ' + data.toString());
        socket.write(data);
    });

    socket.on('end', function() {
        console.log('[end]');
    });
});

server.listen(8124);
