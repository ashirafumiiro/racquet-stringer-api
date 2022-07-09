var express = require('express');
var router = express.Router();

var account_controller = require('../controllers/accountController');

router.route('/:id')
    .get(account_controller.getOneAccount)
    .patch(account_controller.updateAccount)
    .delete(account_controller.deleteAccount);

router.route('/')
    .get(account_controller.account_list)
    .post(account_controller.createAccount);

module.exports = router;
