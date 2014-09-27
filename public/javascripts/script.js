var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection;
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();

var analysers = [ ]

var VoiceChat = function(socketId, stream) {
  var stream = stream;
  var div = document.createElement('div');
  div.className = 'chat-item';

  var img = document.createElement('img');
  img.className = 'ident-image';
  img.src = '/identicon/' + socketId + '.png';
  div.appendChild(img);

  var volumeDiv = document.createElement('div');
  volumeDiv.className = 'volume-container'
  var volumeValueInverseDiv = document.createElement('div');
  volumeValueInverseDiv.className = 'volume-value-inverse'
  volumeDiv.appendChild(volumeValueInverseDiv);
  div.appendChild(volumeDiv);

  var audioSource = audioContext.createMediaStreamSource(stream);
  var analyser = audioContext.createAnalyser();
  var gain = audioContext.createGain();

  audioSource.connect(gain);
  gain.connect(analyser);

  var init = function(domId) {
    analyser.connect(audioContext.destination);
    var p = document.getElementById(domId);
    p.appendChild(div);
    analysers[socketId] = this;
  }

  var fini = function() {
    analyser.disconnect(audioContext.destination);
    audioSource.disconnect(analyser);
    div.parentElement.removeChild(div);
  }

  var updateAnalysis = function() {
    var data = new Uint8Array(analyser.fftSize);
    analyser.getByteFrequencyData(data);

    var average = 0;
    for (i = 0; i < data.length; ++i) {
      average += data[i];
    }
    average = average / data.length;
    console.log(average);

    volumeValueInverseDiv.style.height = (100 - Math.round(average)) + '%';
  }

  return {
    init: init,
    fini: fini,
    gain: gain,
    stream: stream,
    analyser: analyser,
    updateAnalysis: updateAnalysis
  }
};
  
function animateAnalysers(timestamp) {
  for (id in analysers) {
    analysers[id].updateAnalysis();
  };
}

function animationLoop(f) {
  var animate = function (timestamp) {
    f(timestamp);
    window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);
}

function init() {
  if(PeerConnection) {
    rtc.createStream({
      "video": false,
      "audio": true
    }, function(stream) {
      var chat = new VoiceChat('self', stream);
      chat.init('chat-container');
    });
  } else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }

  animationLoop(animateAnalysers);


  // socket.emit('announce');

  var room = window.location.hash.slice(1);
  rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);

  rtc.on('add remote stream', function(stream, socketId) {
    var vc = new VoiceChat(socketId, stream);
    vc.init('chat-container');
  });

  rtc.on('disconnect stream', function(socketId) {
    if (analysers[socketId]) {
      analysers[socketId].fini();
    }
  });
}

