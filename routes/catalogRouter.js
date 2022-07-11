var express = require('express');
var router = express.Router();

var catalogController = require('../controllers/catalogController');


router.get('/inventory/:id',catalogController.getInventory);
router.get('/orders/:id', catalogController.getOrders);
router.post("/register-business", catalogController.registerBusiness);
router.post('/edit-shop-settings/:id', catalogController.editShopSettings);
router.post('/create-order', catalogController.createOrder);

module.exports = router;