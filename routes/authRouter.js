var express = require('express');
var router = express.Router();

var auth_controller = require('../controllers/authController');

router.post("/login", auth_controller.login);
router.post("/send-otp", auth_controller.sendOTP);
router.post('/verify-otp', auth_controller.verify_otp);
router.post('/signup', auth_controller.adminSignUp);
router.post('/forgot-password', auth_controller.forgotPassword);
router.post('/reset-password/:token', auth_controller.resetPassword);

module.exports = router;
