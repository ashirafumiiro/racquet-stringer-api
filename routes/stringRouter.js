var express = require('express');
var router = express.Router();

var string_controller = require('../controllers/stringController');

router.route('/:id')
    .get(string_controller.getOneString)
    .patch(string_controller.updateString)
    .delete(string_controller.deleteString);

router.route('/')
    .get(string_controller.string_list)
    .post(string_controller.createString);

module.exports = router;
