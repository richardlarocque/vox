var express = require('express');
var identicon = require('identicon');
var router = express.Router();

router.get('/:id.png', function(req, res) {
  identicon.generate(req.params.id, 64, function(err, buffer) {
    if (err) {
      res.send(500, { error: err });
    } else {
      res.type('png');
      res.send(buffer);
    }
  })
});

module.exports = router;
