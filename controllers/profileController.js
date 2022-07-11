var Profile = require('../models/profile');
var Account = require('../models/account');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');

exports.profile_list = function(req, res, next) {
    Profile.find({})
    .sort({model : 1})
    .populate('account')
    .exec(function (err, list_profiles) {
      if (err) { return next(err); }
      //Successful, so render
      res.status(200).json({
        status: 'Success',
        results: list_profiles.length,
        list_profiles: list_profiles
      });
    });
  };

exports.getOneProfile = async function (req, res, next) {
  try{
    const profile = await Profile.findById(req.params.id).populate('account'); 
    if (!profile) return next(new AppError("profile with that id not found", 404))

    res.status(200).json({
        status: 'Success',
        profile: profile,
    });
  }
  catch(err){
      next(new AppError(err.message, 500));
  }
}

exports.createProfile = [
   // Validate and sanitize fields.
   body('account', 'account must not be empty.').trim().isLength({ min: 1 }).escape(),

   // Process request after validation and sanitization.
   async (req, res, next) => {

       // Extract the validation errors from a request.
       const errors = validationResult(req);

       // Create a Raquet object with escaped and trimmed data.

       if (!errors.isEmpty()) {
           // There are errors. Render form again with sanitized values/error messages.
            var firstError = (errors.array())[0]
           return next(new AppError(firstError.msg, 400));
       }
       else {
           // Data from body is valid, Save
           try {
            // validate already has profile
              const account = await Account.findById(req.body.account);
              if(!account) return next(new AppError("No account with that id is found", 404))
              const newProfile = await Profile.create({ ...req.body, created: Date.now() });

              res.status(200).json({
                  status: 'Success',
                  profile: newProfile,
              });
           } catch(err) {
            next(new AppError(err.message, 500));
           }
           
       }
   }
]

exports.updateProfile = async (req, res, next) => {
    try{
      const profile = await Profile.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
        })
        if (!profile) return next(new AppError("Profile with that id not found", 404))
    
        res.status(200).json({
        status: 'Success',
        profile: profile,
      });
    }
    catch(err){
      next(new AppError(err.message, 500));
    }       
};
  
exports.deleteProfile = async (req, res, next) => {
  try{
    const profile = await Profile.findByIdAndDelete(req.params.id)
    if (!profile) return next(new AppError("profile with that id not found", 404))
  
    res.status(204).json({
      status: 'Success',
      data: {
        data: null
      },
    });
  }
  catch(err){
    next(new AppError(err.message, 500));
  }
    
};