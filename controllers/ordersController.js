var Order = require('../models/service_order');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');
const { appendOrder } = require('../utils/google-sheet-write');

exports.order_list = function(req, res, next) {
    Order.find({})
    .sort({model : 1})
    .exec(function (err, list_orders) {
      if (err) { return next(err); }
      //Successful, so render
      res.status(200).json({
        status: 'Success',
        results: list_orders.length,
        list_orders
      });
    });
  };

exports.getOneOrder = async function (req, res, next) {
  try{
    const order = await Order.findById(req.params.id).populate('account').populate('string').populate('racquet'); 
    if (!order) return next(new AppError("order with that id not found", 404))

    res.status(200).json({
        status: 'Success',
        order: order,
    });
  }
  catch(err){
      next(new AppError(err.message, 500));
  }
}

exports.createOrder = [
   // Validate and sanitize fields.
   body('account', 'account must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('racquet', 'racquet must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('shop', 'shop must not be empty.').trim().isLength({ min: 1 }).escape(),

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
              const newOrder = await Order.create({ ...req.body, created: Date.now() });
              await appendOrder("Created", newOrder);
              res.status(200).json({
                  status: 'Success',
                  account: newOrder,
              });
           } catch (err) {
            next(new AppError(err.message, 500));
           }
           
       }
   }
]

exports.updateOrder = async (req, res, next) => {
  try{
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
      })
      if (!order) return next(new AppError("Order with that id not found", 404))
  
      res.status(200).json({
      status: 'Success',
      account: order,
    });
  }
  catch(err){
    next(new AppError(err.message, 500));
  }       
};
  
exports.deleteOrder = async (req, res, next) => {
  try{
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) return next(new AppError("order with that id not found", 404))
  
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

exports.create_checkout_session = async (req, res, next) => {
  try {
    
  } catch (error) {
    next(new AppError(err.message, 500));
  }
}