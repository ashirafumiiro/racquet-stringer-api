var Account = require('../models/account');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');
const { appendAccount} = require('../utils/google-sheet-write');

exports.account_list = function(req, res, next) {
    Account.find({})
    .sort({model : 1})
    .populate('shop')
    .exec(function (err, list_accounts) {
      if (err) { return next(err); }
      //Successful, so render
      res.status(200).json({
        status: 'Success',
        results: list_accounts.length,
        list_accounts
      });
    });
  };

exports.getOneAccount = async function (req, res, next) {
  try{
    const account = await Account.findById(req.params.id).populate('shop'); 
    if (!account) return next(new AppError("account with that id not found", 404))

    res.status(200).json({
        status: 'Success',
        account: account,
    });
  }
  catch(err){
      next(new AppError(err.message, 500));
  }
}

exports.createAccount = [
   // Validate and sanitize fields.
   body('full_name', 'full_name must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('email', 'email must be a valid email address.').trim().isLength({ min: 1 }).escape().isEmail(),
   body('password', 'password must not be empty.').trim().isLength({ min: 1 }).escape(),

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
              const newAccount = await Account.create({ ...req.body, created: Date.now() });
              await appendAccount("Created", newAccount);
              res.status(200).json({
                  status: 'Success',
                  account: newAccount,
              });
           } catch (err) {
            next(new AppError(err.message, 500));
           }
           
       }
   }
]

exports.updateAccount = 
   async (req, res, next) => {
        try{
          const account = await Account.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
            })
            if (!account) return next(new AppError("Account with that id not found", 404))
        
            res.status(200).json({
            status: 'Success',
            account: account,
          });
        }
        catch(err){
          next(new AppError(err.message, 500));
        }       
  };
  
exports.deleteAccount = async (req, res, next) => {
  try{
    const account = await Account.findByIdAndDelete(req.params.id)
    if (!account) return next(new AppError("account with that id not found", 404))
  
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