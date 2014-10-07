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
