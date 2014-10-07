/*
 * Copyright 2014 Richard Larocque
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var express = require('express');
var router = express.Router();
var room_names = require('./../room_chooser.js');

/* GET home page. */
router.get('/', function(req, res) {
  res.redirect(302, '/r/' + room_names.choose());
});

router.get('/r/:room([a-zA-Z0-9_]+)', function(req, res) {
    res.render('room', { room: req.params.room });
});

module.exports = router;
