var moniker = require ('moniker');

var cities = new moniker.Dictionary();
cities.read(__dirname + '/data/greek_cities.txt');

var choose = function() {
    return cities.choose() + Math.floor(Math.random() * 10000);
}

module.exports.choose = choose;
