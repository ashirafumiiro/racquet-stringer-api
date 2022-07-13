var express = require('express');
var router = express.Router();

var shop_controller = require('../controllers/shopController');

router.get('/get-enabled', shop_controller.get_enabled);
router.route('/:id')
    .get(shop_controller.getOneShop)
    .patch(shop_controller.updateShop)
    .delete(shop_controller.deleteShop);

router.route('/')
    .get(shop_controller.shop_list)
    .post(shop_controller.createShop);

module.exports = router;
