var express = require('express');
var router = express.Router();

var profile_controller = require('../controllers/profileController');

router.route('/:id')
    .get(profile_controller.getOneProfile)
    .patch(profile_controller.updateProfile)
    .delete(profile_controller.deleteProfile);

router.route('/')
    .get(profile_controller.profile_list)
    .post(profile_controller.createProfile);

module.exports = router;
