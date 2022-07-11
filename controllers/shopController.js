var Shop = require('../models/shop');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');

exports.shop_list = function(req, res, next) {
    Shop.find({})
    .sort({model : 1})
    .populate('created_by')
    .exec(function (err, list_shops) {
      if (err) { return next(err); }
      //Successful, so render
      res.status(200).json({
        status: 'Success',
        results: list_shops.length,
        list_shops: list_shops
      });
    });
  };

exports.getOneShop = async function (req, res, next) {
  try{
    const shop = await Shop.findById(req.params.id).populate('created_by'); 
    if (!shop) return next(new AppError("shop with that id not found", 404))

    res.status(200).json({
        status: 'Success',
        shop: shop,
    });
  }
  catch(err){
      next(new AppError(err.message, 500));
  }
}

exports.createShop = [
   // Validate and sanitize fields.
   body('name', 'name must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('email', 'email must be a valid email address.').trim().isLength({ min: 1 }).escape().isEmail(),
   body('created_by', 'created_by must not be empty.').trim().isLength({ min: 1 }).escape(),

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
            // validate created by exist
              const newShop = await Shop.create({ ...req.body, created: Date.now() });

              res.status(200).json({
                  status: 'Success',
                  shop: newShop,
              });
           } catch (err) {
            next(new AppError(err.message, 500));
           }
           
       }
   }
]

exports.updateShop = [
   async (req, res, next) => {
        try{
          const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
            })
            if (!shop) return next(new AppError("Shop with that id not found", 404))
        
            res.status(200).json({
            status: 'Success',
            shop: shop,
          });
        }
        catch(err){
          next(new AppError(err.message, 500));
        }       
  }
];
  
exports.deleteShop = async (req, res, next) => {
  try{
    const shop = await Shop.findByIdAndDelete(req.params.id)
    if (!shop) return next(new AppError("shop with that id not found", 404))
  
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