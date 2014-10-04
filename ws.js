var server = require('socket.io')();
var router = require('socket.io-events')();
var moniker = require ('moniker');
var sanitizer = require('sanitizer');
var capitalize = require('capitalize');
var _ = require('underscore');

var namer = moniker.generator([moniker.adjective, moniker.noun], { glue: ' ' });

var roomState = {};

var relay = function(socket, name) {
    socket.on(name, function(msg) {
        if (!msg || !msg.targetId) {
            return;
        }
        var s = server.sockets.connected[msg.targetId];
        if (!s) {
            console.error("Message addressed to unknown client.");
        } else {
            s.emit(name, msg);
        }
    });
};

server.on('connect', function(socket) {
    var id = socket.id;
    var room = '';
    var initialName = capitalize.words(namer.choose());
    var userState = { id: socket.id, name: initialName };

    socket.emit('name-offered', initialName);

    var broadcast = function(name, data) {
        if (!room) { return; }
        server.to(room).emit(name, data);
    };

    var broadcastState = function() {
        broadcast('state-update', roomState[room]);
    };

    var updateState = function() {
        if (!room) { return; }
        if (!roomState[room]) { roomState[room] = {}; }
        roomState[room][id] = userState;
        broadcastState();
    };

    socket.on('join-room', function(roomName) {
        room = roomName;
        socket.join(room);

        socket.emit('id-assigned', socket.id);

        updateState();
    });

    socket.on('mic-ready', function() {
        userState.ready = true;
        updateState();
    });

    socket.on('set-name', function(name) {
        userState.name = name;
        updateState();
    });

    socket.on('send-message', function(text) {
        broadcast('message-sent', {
            username: userState.name,
            time: (new Date()).getTime(),
            text: text
        });
    });

    relay(socket, 'ice-candidate-offer');
    relay(socket, 'call-initiation');
    relay(socket, 'call-acceptance');

    socket.on('disconnect', function() {
        if (room) {
            delete roomState[room][id];
        }
        broadcastState();
    });
});

module.exports = server;
