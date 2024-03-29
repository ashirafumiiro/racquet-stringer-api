var express = require('express');
var router = express.Router();

var order_controller = require('../controllers/ordersController');

router.post('/create-checkout-session', order_controller.create_checkout_session);
router.post('/complete-order', order_controller.complete_order);
router.post('/resend-confirmation', order_controller.resend_confirmatation)
router.route('/:id')
    .get(order_controller.getOneOrder)
    .patch(order_controller.updateOrder)
    .delete(order_controller.deleteOrder);

router.route('/')
    .get(order_controller.order_list);
    // .post(order_controller.createOrder);

module.exports = router;
