var express = require('express');
var router = express.Router();

var settings_controller = require('../controllers/siteSettingsController');

router.route('/')
    .get(settings_controller.getSettings)
    .patch(settings_controller.updateSettings)

module.exports = router;