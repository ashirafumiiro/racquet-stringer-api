var Shop = require('../models/shop');
var ShopRequest = require('../models/shop_request');
const stripe = require('stripe')
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');
const { appendShop } = require('../utils/google-sheet-write');
const stripe_utils = require('../utils/stripe-utils');

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


exports.get_user_shop = function(req, res, next) {
  Shop.findOne({created_by: req.params.id})
  .populate('created_by')
  .exec(function (err, shop) {
    if (err) { return next(err); }

    if(!shop) return next(new AppError('no shop found for that user id', 404))
    //Successful, so render
    res.status(200).json({
      status: 'Success',
      shop: shop
    });
  });
};

exports.stripe_webhook = async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_KEY;  
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    // Handle the event
    console.log('EVENT NAME:', event.type);
    var data = event.data;
    let stripe_status;
    let customer_id;
    /*
    switch (event.type) {
      case 'payment_method.attached':
        stripe_status = 'enabled';
        customer_id = data.object.customer;
        console.log("Payment method attached for:", customer_id);
        break;
      case 'payment_method.detached':
          stripe_status = 'disabled';
          customer_id = data.previous_attributes.customer;
          console.log("payment method detached for:", customer_id);
          break;
      case 'customer.subscription.updated':
            console.log("customer.subscription.updated raised");
            break;
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        stripe_status = 'disabled';
          customer_id = data.customer;
          console.log("payment succeeded for:", customer_id);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type`);
    }
    */
    let subscription;
    let status;
    // Handle the event
    switch (event.type) {
      case 'customer.subscription.trial_will_end':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        console.log("subscription", subscription);

        // Then define and call a method to handle the subscription trial ending.
        // handleSubscriptionTrialEnding(subscription);
        break;
      case 'customer.subscription.deleted':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        console.log("subscription", subscription);
        customer_id = subscription.customer;
        stripe_status = 'disabled';
        // Then define and call a method to handle the subscription deleted.
        // handleSubscriptionDeleted(subscriptionDeleted);
        break;
      case 'customer.subscription.created':
        subscription = event.data.object;
        status = subscription.status;
        console.log("subscription", subscription);
        console.log(`Subscription status is ${status}.`);
        // Then define and call a method to handle the subscription created.
        // handleSubscriptionCreated(subscription);
        break;
      case 'customer.subscription.updated':
        subscription = event.data.object;
        status = subscription.status;
        customer_id = subscription.customer;
        if(status === 'active'){
          stripe_status = 'enabled';
        }
        else{
          stripe_status = 'disabled';
        }
        console.log(`Subscription status is ${status}.`);
        console.log("subscription", subscription);
        // Then define and call a method to handle the subscription update.
        // handleSubscriptionUpdated(subscription);
        break;
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`);
    }

    if(stripe_status && customer_id){ // only process if the 2 are defined in the handled events
      var shop = await Shop.findOne({stripe_customer_id: customer_id}).exec();
      if(!shop) throw 'No shop with id found';
      var update_data = {stripe_status: stripe_status};
      if(subscription.id){
        update_data.stripe_subscription_id = subscription.id;
      }
  
      console.log('updating shop:', shop)
      const updatedShop = await Shop.findByIdAndUpdate(shop._id, update_data, {
        new: true,
        runValidators: true
        });
      console.log('Updated: ', updatedShop);
    }

  } catch (err) {
    response.status(500).send(`Webhook Error: ${err.message}`);
    console.log("Webhook error:", err);
    return;
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
}

exports.create_shop_request = [
  // Validate and sanitize fields.
  body('shop_name', 'shop_name must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('phone', 'phone must not be empty.').trim().isLength({ min: 1 }).escape(),

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
             const newShopRequest = await ShopRequest.create({ ...req.body, created: Date.now() });
             await appendShop("Created", newShopRequest);
             res.status(200).json({
                 status: 'Success',
                 shop_request: newShopRequest,
             });
          } catch (err) {
           next(new AppError(err.message, 500));
          }
          
      }
  }
];

exports.shop_requests_list = function(req, res, next) {
  ShopRequest.find({})
  .sort({shop_name : 1})
  .exec(function (err, requests_list) {
    if (err) { return next(err); }
    //Successful, so render
    res.status(200).json({
      status: 'Success',
      results: requests_list.length,
      shop_requests: requests_list
    });
  });
};

exports.create_stripe_session = async function(req, res, next) {
  try {
    const id = req.body.shop_id;
    var shop = await Shop.findById(id);
    if(!shop) return next(new AppError("shop with that id does not exist", 404))
    let stripe_id = shop.stripe_customer_id;
    if(!stripe_id){
      console.log('No stripe id, getting one')
      var stripe_customer = await stripe_utils.create_customer(shop.name, shop.email, shop.uuid);
      if(stripe_customer && stripe_customer.id){
          shop = await Shop.findByIdAndUpdate(shop._id, {stripe_customer_id: stripe_customer.id},{
            new: true,
            runValidators: true
            });
          stripe_id = shop.stripe_customer_id;
      }
      else{
        return next(new AppError('failed to register in stripe', 500));
      } 
      
    }
    var url = await stripe_utils.create_session(stripe_id);
    res.status(200).json({
      status: 'Success',
      url: url
    });
    
  } catch (err) {
    next(new AppError(err.message, 500));
  } 
};


exports.create_subscription_session = async function(req, res, next) {
  try {
    const id = req.body.shop_id;
    var shop = await Shop.findById(id);
    if(!shop) return next(new AppError("shop with that id does not exist", 404))
    let stripe_id = shop.stripe_customer_id;
    if(!stripe_id){
      console.log('No stripe id, getting one')
      var stripe_customer = await stripe_utils.create_customer(shop.name, shop.email, shop.uuid);
      if(stripe_customer && stripe_customer.id){
          shop = await Shop.findByIdAndUpdate(shop._id, {stripe_customer_id: stripe_customer.id},{
            new: true,
            runValidators: true
            });
          stripe_id = shop.stripe_customer_id;
      }
      else{
        return next(new AppError('failed to register in stripe', 500));
      } 
      
    }
    var session = await stripe_utils.create_subscription_session(stripe_id);
    res.status(200).json({
      status: 'Success',
      url: session.url
    });
    
  } catch (err) {
    next(new AppError(err.message, 500));
  } 
};