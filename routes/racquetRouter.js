var express = require('express');
var router = express.Router();

var racquet_controller = require('../controllers/racquetController');


router.get('/get-by-code/:code', racquet_controller.getOneByQrCode)
router.get('/get-by-value/:value', racquet_controller.getOneByValue)

router.route('/:id')
    .get(racquet_controller.getOneRacquet)
    .patch(racquet_controller.updateRacquet)
    .delete(racquet_controller.deleteRacquet);

router.route('/')
    .get(racquet_controller.racquet_list)
    .post(racquet_controller.createRacquet);

module.exports = router;

