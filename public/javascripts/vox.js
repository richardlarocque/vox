'use strict';

// Polyfills.
var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

function error(err) {
    console.error(err);
}

var RTC_CONFIGURATION = 
    { iceServers: [{ urls: "stun:stun1.l.google.com:19302",
                     url: "stun:stun1.l.google.com:19302" }] };

function Peer(initialState, sockService, mediaService, manager) {
    var self = {};

    self.on = function(eventName, callback) {
        self.listeners[eventName] = self.listeners[eventName] || [];
        self.listeners[eventName].push(callback);
    };

    self.emit = function(eventName, params) {
        _.each(self.listeners[eventName], function(cb) { cb(params); });
        _.each(self.eventProxies, function(ep) { ep.emit(eventName, params); });
    };
    
    self.updateState = function(params) {
        var readyStateChanging = self.peer.ready != params.ready;
        
        self.peer.id = params.id;
        self.peer.name = params.name;
        self.peer.ready = params.ready;
        self.emit('peer-state-updated', params);

        if (readyStateChanging) {
            self.emit('ready-state-changed');
        }
    };

    self.isReady = function() {
        return self.peer.ready && pc.iceConnectionState != 'closed';
    };

    var relayIceCandidate = function(event) {
        if (!event.candidate) {
            console.log('Non canidate');
            return;
        }
        
        console.log('Offering ice candidate');
        sockService.emit('ice-candidate-offer', {
            targetId: self.peer.id,
            senderId: self.local.id,
            candidate: event.candidate
        });
    };

    var receiveIceCandidate = function(msg) {
        if (self.destructed) { return; }
        if (msg.senderId != self.peer.id) { return; }
        
        console.log('Received ice candidate');
        self.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    };

    var startCall = function() {
        if (self.destructed) { return; }
        
        if (self.didInitiateCall) {
            return;
        }
        self.didInitiateCall = true;
        
        console.log('Calling to ' + self.peer.id);

        self.pc.addStream(mediaService.stream);
        self.pc.createOffer(function(offer) {
            self.pc.setLocalDescription(offer, function() {
                sockService.emit('call-initiation', {
                    senderId: self.local.id,
                    targetId: self.peer.id,
                    offer: offer
                });
            }, error);
        }, error);
    };

    var acceptCall = function(msg) {
        if (self.destructed) { return; }
        if (msg.senderId != self.peer.id) { return; }
        
        console.log('AcceptCall ' + self.local.id);
        self.pc.addStream(mediaService.stream);
        self.pc.setRemoteDescription(new RTCSessionDescription(msg.offer), function() {
            self.pc.createAnswer(function(answer) {
                self.pc.setLocalDescription(answer, function() {
                    sockService.emit('call-acceptance', {
                        senderId: self.local.id,
                        targetId: msg.senderId,
                        answer: answer
                        
                    });
                });
            }, error);
        });
    };

    var callAccepted = function(msg) {
        if (self.destructed) { return; }
        if (msg.senderId != self.peer.id) { return; }
        
        console.log('CallAccepted ' + self.local.id);
        self.pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
    };

    self.destruct = function() {
        console.log('Destructing ' + self.local.id);
        self.destructed = true;  // HAX!  FIXME
        self.pc.close();
    };

    var tryConnect = function() {
        if (!mediaService.haveMedia()) {
            return;
        }
        if (!self.peer.ready) {
            return;
        }
        if (self.peer.id < self.local.id) {
            return;
        }
        startCall();
    };

    self.local = {};
    
    self.local.id = sockService.id;
    self.eventProxies = [manager];

    self.listeners = {};
    self.pc = new RTCPeerConnection(RTC_CONFIGURATION);

    self.peer = {};

    mediaService.on('got-user-media', function() { tryConnect(); });

    self.on('ready-state-changed', function() { tryConnect(); });

    self.pc.onicecandidate = relayIceCandidate;
    self.pc.onaddstream = function(event) { self.emit('stream-added', event); };
    self.pc.oniceconnectionstatechange = function(event) { self.emit('iceconnectionstatechange', event); };
    self.pc.onsignalingstatechange = function(event) { self.emit('signalingstatechange', event); };
    self.pc.onnegotiationneeded = function(event) { self.emit('negotiationneeded', event); };

    sockService.on('call-initiation', acceptCall);
    sockService.on('call-acceptance', callAccepted);
    sockService.on('ice-candidate-offer', receiveIceCandidate);

    self.updateState(initialState);

    return self;
};

angular.module('voxApp', ['ngSanitize'])
    .filter('base64', function() {
        return function(input) {
            return btoa(input);
        };
    })

    .factory('sockService', function() {
        var socket = io();
        socket.emit('join-room', document.location.pathname);
        socket.on('id-assigned', function(id) {
            socket.id = id;
        });
        return socket;
    })

    .factory('mediaService', ['sockService', function(sockService) {
        var ret = {};
        var listeners = {};
        
        ret.on = function(eventName, callback) {
            listeners[eventName] = listeners[eventName] || [];
            listeners[eventName].push(callback);
        };
        
        ret.emit = function(eventName, params) {
            _.each(listeners[eventName], function(cb) { cb(params); });
        };

        ret.haveMedia = function() {
            return ret.stream && !ret.stream.ended;
        };

        getUserMedia.bind(navigator)({ audio: true, video: false }, function(stream) {
            stream.onended = function() {
                ret.emit('stream-ended');
            };
            
            sockService.emit('mic-ready');
            ret.stream = stream;
            ret.emit('got-user-media', stream);
        }, error);

        return ret;
    }])

    .factory('peerService', ['sockService', 'mediaService', function(sockService, mediaService) {
        var peers = {};
        var listeners = [];

        var ret = {};

        ret.on = function(eventName, callback) {
            listeners[eventName] = listeners[eventName] || [];
            listeners[eventName].push(callback);
        };
    
        ret.emit = function(eventName, params) {
            _.each(listeners[eventName], function(cb) { cb(params); });
        };

        ret.getPeers = function() {
            return peers;
        };

        sockService.on('state-update', function(users) {
            if (!sockService.id) {
                return;
            }

            // Don't count ourselves here.
            var users = _.omit(users, sockService.id);

            // Remove old peers.
            var missing = _.difference(_.keys(peers), _.keys(users));
            _.each(missing, function(peerId) {
                peers[peerId].destruct();
                delete peers[peerId];
            });

            var newPeers = _.difference(_.keys(users), _.keys(peers));
            _.each(newPeers, function(peerId) {
                peers[peerId] = Peer(users[peerId], sockService, mediaService, ret);
            });

            var updated = _.intersection(_.keys(users), _.keys(peers));
            _.each(updated, function(peerId) {
                peers[peerId].updateState(users[peerId]);
            });
        });

        return ret;
    }])

    .controller('NameController', ['$scope', 'sockService', 'mediaService', function($scope, sockService, mediaService) {
        $scope.name = '';

        $scope.haveMedia = function() {
            return !!mediaService.haveMedia();
        };

        sockService.on('name-offered', function(name) {
            if (!$scope.name) {
                $scope.name = name;
                $scope.$apply();
            }
        });

        mediaService.on('got-user-media', function() {
            $scope.$apply();
        });

        $scope.$watch(function() { return $scope.name }, function (value) {
            if (value) {
              sockService.emit('set-name', value);
            }
        });
    }])

    .controller('OthersController', ['$scope', 'peerService', function($scope, peerService) {
        $scope.peers = function() {
            return peerService.getPeers();
        };

        var listenFor = function(source, eventName) {
            source.on(eventName, function(event) {
                console.log(eventName +  ': ' + JSON.stringify(event));
                $scope.$apply();
            });
        };

        listenFor(peerService, 'peer-state-updated');
        listenFor(peerService, 'iceconnectionstatechange');
        listenFor(peerService, 'signalingstatechange');
        listenFor(peerService, 'negotiationneeded');
    }])

    .controller('ChatController', [ '$scope', 'sockService', function($scope, sockService) {
        $scope.messages = [
        ];
        $scope.chatText = "";

        sockService.on('message-sent', function(msg) {
            $scope.messages.push(msg);
            $scope.$apply();
        });

        $scope.sendMessage = function() {
            sockService.emit('send-message', $scope.chatText);
            $scope.chatText = "";
        };
    }])

    .controller('OutputController', [ '$sce', '$scope', 'peerService', function($sce, $scope, peerService) {
        $scope.blobURLs = [];

        peerService.on('stream-added', function(event) {
            console.log('Adding output stream');
            $scope.blobURLs.push($sce.trustAsResourceUrl(URL.createObjectURL(event.stream)));
            $scope.$apply();
        });
    }]);
