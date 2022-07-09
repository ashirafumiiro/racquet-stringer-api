var express = require('express');
var router = express.Router();

var order_controller = require('../controllers/ordersController');

router.route('/:id')
    .get(order_controller.getOneOrder)
    .patch(order_controller.updateOrder)
    .delete(order_controller.deleteOrder);

router.route('/')
    .get(order_controller.order_list)
    .post(order_controller.createOrder);

module.exports = router;
