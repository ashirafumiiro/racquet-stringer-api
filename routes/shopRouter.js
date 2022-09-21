var express = require('express');
var router = express.Router();

var shop_controller = require('../controllers/shopController');

router.get('/get-enabled', shop_controller.get_enabled);
router.get('/user-shop/:id', shop_controller.get_user_shop);
router.post('/stripe-portal-session', shop_controller.create_stripe_dashboard_session);
router.post('/subscription-session', shop_controller.create_subscription_session);
router.post('/onboard-session', shop_controller.create_onboarding_session);
router.post('/get-tax', shop_controller.get_tax);

router.route('/shop-requests')
    .get(shop_controller.shop_requests_list)
    .post(shop_controller.create_shop_request);
    
router.route('/:id')
    .get(shop_controller.getOneShop)
    .patch(shop_controller.updateShop)
    .delete(shop_controller.deleteShop);

router.route('/')
    .get(shop_controller.shop_list)
    .post(shop_controller.createShop);

module.exports = router;
