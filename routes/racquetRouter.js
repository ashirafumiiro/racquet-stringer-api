var express = require('express');
var router = express.Router();

var racquet_controller = require('../controllers/racquetController');


router.route('/')
    .get(racquet_controller.racquet_list)
    .post(racquet_controller.createRacquet);

router.route('/:id')
    .get(racquet_controller.getOneRacquet)
    .patch(racquet_controller.updateRacquet)
    .delete(racquet_controller.deleteRacquet);

module.exports = router;

