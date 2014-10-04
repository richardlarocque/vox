var express = require('express');
var router = express.Router();
var moniker = require ('moniker');
var global = require('../global.js');

var cities = new moniker.Dictionary();
cities.read('data/greek_cities.txt');
var getRoom = function() {
    return cities.choose() + Math.floor(Math.random() * 10000);
}

/* GET home page. */
router.get('/', function(req, res) {
  res.redirect(302, '/r/' + getRoom());
});

router.get('/r/:room([a-zA-Z0-9_]+)', function(req, res) {
    res.render('room', { room: req.params.room });
});

module.exports = router;
