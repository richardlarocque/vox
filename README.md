Peer to peer voice chat over WebRTC
===

A simple zero-configuration chat coordination server.  Supports text
chat, too.

Intended to be as low-friction as possible.  No installs.  No
sign-ups.  No accounts.

Join or create a room by visiting a URL.  Share an invite to a room by
sharing the URL.  Voice chat can begin as soon as the browser's
getUserMedia() permissions dialog is accepted.

Rooms are located at /r/RoomName, and are created and destroyed on
demand.

Visitors who visit / will be redirected to a randomly generated room.

Built with Node, Express, Angular, socket.io, and WebRTC.

===

Licensed under the Apache License, Version 2.0.  See LICENSE file for
details.