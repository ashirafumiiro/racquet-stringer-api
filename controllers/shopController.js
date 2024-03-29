var Shop = require('../models/shop');
var Order = require('../models/service_order');
var ShopRequest = require('../models/shop_request');
const stripe = require('stripe')
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');
const { appendShop, appendOrder } = require('../utils/google-sheet-write');
const stripe_utils = require('../utils/stripe-utils');
const Email = require('../utils/email');
const uuid = require("uuid").v4;
const twilio_utils = require('../utils/twilio-utils');

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
    let shop = await Shop.findById(req.params.id).populate('created_by'); 
    if (!shop) return next(new AppError("shop with that id not found", 404))
    shop = await appearedToClients(shop)

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
              const newShop = await Shop.create({ ...req.body, created: Date.now(), uuid: uuid() });
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
           console.log('body',req.body);
           let shop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
            })
            if (!shop) return next(new AppError("Shop with that id not found", 404))
            shop = await appearedToClients(shop)

            await appendShop("Updated", shop);
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
  Shop.find({stripe_status: "enabled", enabled: true, stripe_account_enabled: true})
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
  // const endpointSecret = 'whsec_121e9ee910789dee86995fbbc00b271dd672d233a114cd770f8bd97714c9888d'
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    // Handle the event
    console.log('EVENT NAME:', event.type);
    var data = event.data;
    let stripe_status;
    let customer_id;

    let subscription;
    let status;
    let handle_account = false;
    let handle_checkout = false;
    let account_data;
    let checkout_data;
    let checkout_status; // completed, failed, succeeded
    // Handle the event
    switch (event.type) {
      case 'customer.subscription.trial_will_end':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        console.log("subscription", subscription);
        break;
      case 'customer.subscription.deleted':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        console.log("subscription", subscription);
        customer_id = subscription.customer;
        stripe_status = 'disabled';
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
        break;
      case 'account.updated':
        handle_account = true;
        account_data = event.data.object;
        break;
      // case 'checkout.session.completed':
      //   handle_checkout = true;
      //   checkout_data = event.data.object;
      //   break;
      //   case 'checkout.session.async_payment_succeeded':
      //     handle_checkout = true;
      //     checkout_data = event.data.object;
      //   break;
      // case 'checkout.session.async_payment_failed':
      //   handle_checkout = true;
      //   checkout_data = event.data.object;
      //   break;
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
      await appendShop("Updated", updatedShop);
    }
    // if(handle_account){
    //   await handleAccount(account_data);
    // }

    // if(handle_checkout){
    //   await handleCheckout(checkout_data);
    // }
  } catch (err) {
    response.status(500).send(`Webhook Error: ${err.message}`);
    console.log("Webhook error:", err);
    return;
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
}

exports.stripe_webhook2 = async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_KEY_2;  
  // const endpointSecret = 'whsec_121e9ee910789dee86995fbbc00b271dd672d233a114cd770f8bd97714c9888d'
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    // Handle the event
    console.log('EVENT NAME:', event.type);
    var data = event.data;

    let handle_checkout = false;
    let handle_account = false;
    let account_data;
    let checkout_data;
    let checkout_status; // completed, failed, succeeded
    // Handle the event
    switch (event.type) {
     /* case 'customer.subscription.trial_will_end':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        console.log("subscription", subscription);
        break;
      case 'customer.subscription.deleted':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        console.log("subscription", subscription);
        customer_id = subscription.customer;
        stripe_status = 'disabled';
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
        break;
        */
      case 'account.updated':
        handle_account = true;
        account_data = event.data.object;
        break;
        
      case 'checkout.session.completed':
        handle_checkout = true;
        checkout_data = event.data.object;
        break;
        case 'checkout.session.async_payment_succeeded':
          handle_checkout = true;
          checkout_data = event.data.object;
        break;
      case 'checkout.session.async_payment_failed':
        handle_checkout = true;
        checkout_data = event.data.object;
        break;
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`);
    }
    /*
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
      await appendShop("Updated", updatedShop);
    }
    */
    if(handle_account){
      await handleAccount(account_data);
    }
    
    if(handle_checkout){
      await handleCheckout(checkout_data);
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

exports.create_stripe_dashboard_session = async function(req, res, next) {
  try {
    const id = req.body.shop_id;
    var shop = await Shop.findById(id);
    if(!shop) return next(new AppError("shop with that id does not exist", 404));
    if(!shop.enabled) return next(new AppError("shop not enabled. Contact admin", 400));
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
    if(!shop) return next(new AppError("shop with that id does not exist", 404));
    let stripe_id = shop.stripe_customer_id;
    if(!shop.stripe_price_id) return next(new AppError("shop subscription price not set", 400));
    if(!shop.enabled) return next(new AppError("shop not enabled. Contact admin", 400));
    if(!stripe_id){
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
    var session = await stripe_utils.create_subscription_session(stripe_id, shop.stripe_price_id);
    res.status(200).json({
      status: 'Success',
      url: session.url
    });
    
  } catch (err) {
    next(new AppError(err.message, 500));
  } 
};

exports.create_onboarding_session =  async function(req, res, next) {
  try {
    const id = req.body.shop_id;
    var shop = await Shop.findById(id);
    if(!shop) return next(new AppError("shop with that id does not exist", 404))
    let stripe_account_id = shop.stripe_account_id;

    if(!shop.enabled) return next(new AppError("shop not enabled. Contact admin", 400));
    if(!stripe_account_id){
      console.log('No stripe id, getting one')
      var stripe_account = await stripe_utils.create_account(shop.name, shop.email, shop.uuid);
      if(stripe_account && stripe_account.id){
          shop = await Shop.findByIdAndUpdate(shop._id, {stripe_account_id: stripe_account.id},{
            new: true,
            runValidators: true
            });
          stripe_account_id = shop.stripe_account_id;
      }
      else{
        return next(new AppError('failed to register in stripe', 500));
      } 
    }

    var session = await stripe_utils.create_onboarding_link(stripe_account_id);
    res.status(200).json({
      status: 'Success',
      url: session.url
    });
    
  } catch (err) {
    next(new AppError(err.message, 500));
  } 
};

async function handleCheckout(session){
  let status = session.payment_status;
  console.log('Checkout Payment Status:', status);
  const metadata = session.metadata;
  const order_id = metadata.order_id;

  if(status === 'paid' && order_id){
    let order_status = 'Processing';
    const order = await Order.findById(order_id).populate('delivery_shop'); 
    if (!order) throw new Error("order with that id not found");
    const shop = order.delivery_shop;
    const email = shop.email;
    // const customer_email = order.delivery_address.email;
    const customer_phone = order.delivery_address.phone_number;

    const saved = await Order.findByIdAndUpdate(order._id, {status: order_status}, {
      new: true,
      runValidators: true
      });
    var order_number = order.order_number;
    console.log(`Completed payment for order:#${order_number}`);

    // send email coz payment has been sent
    await new Email({email: email}, '', '').shopOrderPayment(order_number);
    // await new Email({email: customer_email}, '', '').custormerOrderPyament(shop.name, order_number);
    let msg = `Hello there, payment for your order #${order_number} has been recieved. You will be notified when it is available for pickup.`
    await twilio_utils.sendMessage(customer_phone, msg);


    appendOrder('Updated', saved);
  }

}

async function handleAccount(account){
  console.log('Handling Acoount data:');
  const metadata = account.metadata;
  let shop_uuid = metadata.uuid;
  
  let stripe_account_enabled = account.charges_enabled;
  console.log("Account.charges_enabled:", stripe_account_enabled);
  let shop = await Shop.findOne({uuid: shop_uuid});
  if (!shop){
    throw new Error('No shop with uuid found')
  }

  shop = await appearedToClients(shop)
  let appeared_to_clients = shop.appeared_to_clients

  console.log('Updating shop:', shop._id);
  shop = await Shop.findByIdAndUpdate(shop._id, {stripe_account_enabled, appeared_to_clients}, {
    new: true,
    runValidators: true
    });
    await appendShop("Updated", shop);
    console.log('Completed updating account');
}


async function appearedToClients(shop){
  let appeared_to_clients = false
  if(shop.stripe_account_enabled && shop.enabled && shop.stripe_status === 'enabled')
      appeared_to_clients = true
  if(appeared_to_clients && !shop.appeared_to_clients){
    shop = await Shop.findByIdAndUpdate(shop._id, {appeared_to_clients}, {
      new: true,
      runValidators: true
      })
  }
  return shop
}

exports.get_tax = async (req, res, next) => {
  try {
    let amount = parseInt(req.body.amount);
    let shop_id = req.body.shop_id;

    let shop = await Shop.findById(shop_id);
    if (!shop) return next(new AppError("shop with that id not found", 404))
    if (!shop.enabled || !shop.stripe_account_id || shop.stripe_status != "enabled")
      throw new Error("shop cannot receive payment");


    const price = parseInt('' + (amount * 100))
    let comission = parseInt('' + ((shop.comission || 0) * 100));
    let percentage_comission = parseInt('' + ((shop.percentage_comission || 0) * amount));
    const session = await stripe_utils.create_checkout_session(price, shop.stripe_account_id, comission + percentage_comission, {'notes': 'Getting tax'});

    console.log('Session:', session)
    res.status(200).json({
      status: 'Success',
      tax: session.total_details.amount_tax
    });

  }
  catch (err) {
    next(new AppError(err.message, 500));
  }
}