var server = require('socket.io')();
var router = require('socket.io-events')();
var moniker = require ('moniker');
var sanitizer = require('sanitizer');
var capitalize = require('capitalize');
var _ = require('underscore');

var namer = moniker.generator([moniker.adjective, moniker.noun], { glue: ' ' });

var userState = [];

var updateOthers = function(userId) {
  var ids = _.keys(userState);
  var other_ids = _.without(ids, userId);
  _.each(_.pick(userState, other_ids), sendStateUpdate);
}

var lookupSocket = function(id) {
    return server.sockets.connected[id];
}

// Generic forwarder function.
router.on('*', function(sock, args, next) {
    var name = args[0];
    var msg = args[1];
    if (msg && msg.targetId) {
	var s = server.sockets.connected[msg.targetId];
	if (s) {
	    console.log('Relaying: ' + JSON.stringify(msg));
	    s.emit(name, msg);
	} else {
	    console.error("Message addressed to unknown client." + JSON.stringify(msg));
	}
    }
    next();
});

router.on('mic-ready', function(sock, args, next) {
    console.log('Got mic ready');
    userState[sock.id].ready = true;
    updateOthers(sock.id);
    next();
});

router.on('update-user-state', function(sock, args, next) {
    console.log(JSON.stringify(args));
    var opts = args[1];

    var name;
    var user = userState[sock.id];
    try {
	name = sanitizer.sanitize(opts.name).substring(0,255);
    } catch(err) {
	console.log('Error: ' + err);
    }

    if (name) {
	user.name = name;
	console.log('Setting name: ' + name);
    }
    updateOthers(user.id);
    next();
});


server.use(router);

var sendStateUpdate = function(user) {
  var socket = lookupSocket(user.id);
  if (!socket) {
    console.log('Lookup failed, skipping: ' + user.name);
    return;
  }
  var others = _.omit(userState, user.id);
  var peerData = _.map(others, function(x) { return _.pick(x, 'name', 'id', 'ready') } );
  console.log('Updating: ' + user.name);
  console.log('others: ', _.keys(peerData).length);
  _.each(peerData, function(u) {
    console.log(JSON.stringify(u));
  });
  socket.emit('state-update', { clientId: user.id, clientName: user.name, peers: peerData });
}

var broadcastMessage = function(msg) {
  _.each(_.values(userState), function(user) {
    var socket = lookupSocket(user.id);
    if (!socket) {
      console.log('Lookup failed, skipping: ' + user.name);
      return;
    }
    socket.emit('message-sent', msg);
  });
};

server.on('connect', function(socket) {
    console.log('Connected!');

    var id = socket.id;
    var newUser = {
	id: socket.id,
	name: capitalize.words(namer.choose()),
    };

    userState[id] = newUser;

    socket.emit('name-offered', { name: newUser.name });

    sendStateUpdate(newUser);
    updateOthers(newUser.id);

    console.log(JSON.stringify(newUser));

    socket.on('send-message', function(text) {
	var data = {
	    username: userState[socket.id].name,
	    time: (new Date()).getTime(),
	    text: text
	}
	broadcastMessage(data);
    });

    socket.on('disconnect', function() {
	delete userState[socket.id];
	updateOthers(socket.id);
    });
});

module.exports = server;
