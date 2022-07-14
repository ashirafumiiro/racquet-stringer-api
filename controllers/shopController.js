var Shop = require('../models/shop');
const stripe = require('stripe');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');
const { appendShop } = require('../utils/google-sheet-write');

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
              await appendShop("Created", newShop);
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

exports.get_enabled = function(req, res, next) {
  Shop.find({stripe_status: "enabled"})
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

exports.stripe_webhook = async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_KEY;
  console.log('sig:', sig);
  console.log('endpointSecret:', endpointSecret)
  
  let event;

  try {
    const key = request.query.key;
    const id = request.query.id;
    if(key != process.env.API_KEY){
      throw 'Invalid API Key';
    }
    const shop = await Shop.findOne({uuid: id}).exec();
    if(!shop) throw `No shop with id: ${id} found`;
   

    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    var stripe_status = shop.stripe_status;
     // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        stripe_status = 'enabled';
        console.log("customer.subscription.created raised");
        break;
      case 'customer.subscription.deleted':
          stripe_status = 'disabled'
          console.log("customer.subscription.deleted raised");
          break;
      case 'customer.subscription.updated':
            console.log("customer.subscription.updated raised");
            break;
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Then define and call a function to handle the event payment_intent.succeeded
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    const updatedShop = await Shop.findByIdAndUpdate(shop._id, {stripe_status: stripe_status}, {
      new: true,
      runValidators: true
      })
      if (!updatedShop) return next(new AppError("Shop with that id not found", 404))

  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    console.log("Webhook error:", err);
    return;
  }



  // Return a 200 response to acknowledge receipt of the event
  response.send();
}