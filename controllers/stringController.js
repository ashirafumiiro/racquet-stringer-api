var StringModel = require('../models/string');
var Shop = require('../models/shop');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');

exports.string_list = function(req, res, next) {
    StringModel.find({})
    .sort({model : 1})
    .populate('shop')
    .exec(function (err, list_strings) {
      if (err) { return next(err); }
      //Successful, so render
      res.status(200).json({
        status: 'Success',
        results: list_strings.length,
        list_strings
      });
    });
  };

exports.getOneString = async function (req, res, next) {
  try{
    const string = await StringModel.findById(req.params.id); 
    if (!string) return next(new AppError("string with that id not found", 404))

    res.status(200).json({
        status: 'Success',
        string: string,
    });
  }
  catch(err){
      next(new AppError(err.message, 500));
  }
}

exports.createString = [
   // Validate and sanitize fields.
   body('model', 'model must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('brand', 'brand must not be empty').trim().isLength({ min: 1 }).escape(),
   body('type', 'type must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('shop', 'shop must be a valid shop id.').trim().isLength({ min: 1 }).escape(),

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
              const shop = await Shop.findById(req.body.shop).exec();
              if(!shop) return next(new AppError("shop with specified id does not exist", 404))
              const newString = await StringModel.create({ ...req.body, created: Date.now() });

              res.status(200).json({
                  status: 'Success',
                  string: newString,
              });
           } catch (err) {
            next(new AppError(err.message, 500));
           }
           
       }
   }
]

exports.updateString = async (req, res, next) => {
        try{
          const string = await StringModel.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
            })
            if (!string) return next(new AppError("String with that id not found", 404))
        
            res.status(200).json({
            status: 'Success',
            string: string,
          });
        }
        catch(err){
          next(new AppError(err.message, 500));
        }       
  };
  
exports.deleteString = async (req, res, next) => {
  try{
    const string = await StringModel.findByIdAndDelete(req.params.id)
    if (!string) return next(new AppError("string with that id not found", 404))
  
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