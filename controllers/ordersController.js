var Order = require('../models/service_order');
var String = require('../models/string');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');
const { appendOrder } = require('../utils/google-sheet-write');
const stripe_utils = require('../utils/stripe-utils');
const Email = require('../utils/email');

exports.order_list = function(req, res, next) {
    var options = {
      path: 'racquet.mains.string_id',
      model: 'String'
    };
    Order.find({}).populate('racquet').populate('racquet.mains.string_id').populate('racquet.crosses.string_id')
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
    const order = await Order.findById(req.params.id).populate('delivery_shop').populate('racquet')
                            .populate('racquet.mains.string_id').populate('racquet.crosses.string_id'); 
    if (!order) return next(new AppError("order with that id not found", 404))
    var json = order.toJSON();

    json.racquet.mains.string_id = (await String.findById(order.racquet.mains.string_id)).toJSON();
    json.racquet.crosses.string_id = (await String.findById(order.racquet.crosses.string_id)).toJSON()

    res.status(200).json({
        status: 'Success',
        order: json,
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
      await appendOrder('Updated', order);
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

const get_checkout_session = async function(order){
    const shop = order.delivery_shop;
    if(!shop.enabled || !shop.stripe_account_id|| shop.stripe_status != "enabled")
      throw new Error("shop cannot receive payment");
    const stripe_account_enabled = await stripe_utils.accout_charges_enabled(shop.stripe_account_id)
    if(!stripe_account_enabled) throw new Error("shop cannot receive payment");
    var client_email = order.delivery_address.email;
    const metadata = {
      order_id: order.id,
      order_number: order.order_number,
      uuid: order.uuid,
      client_email: client_email
    }
    console.log('Order details:', order);
    const price = parseInt(''+ (order.amount*100))
    const comission = parseInt(''+ ((shop.comission || 0) * 100))
    const session = await stripe_utils.create_checkout_session(price, shop.stripe_account_id,comission, metadata);
    
    return session.url;
}


exports.create_checkout_session = async (req, res, next) => {
  try {
    const order = await Order.findById(req.body.order_id).populate('delivery_shop'); 
    if (!order) return next(new AppError("order with that id not found", 404));
    var url = await get_checkout_session(order);
    res.status(200).json({
      status: 'Success',
      url: url
    });
  } catch (error) {
    next(new AppError(err.message, 500));
  }
}

exports.process_stripe_checkout_events = async (event, data) => {
  try {
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
    
  } catch (err) {
    response.status(500).send(`Webhook Error: ${err.message}`);
    console.log("Webhook error:", err);
    return;
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
}


exports.get_checkout_session = get_checkout_session;

exports.complete_order = async (req, res, next) =>{
    try {
      var order_id = req.body.order_id;
      const order = await Order.findById(order_id).populate('delivery_shop'); 
      if (!order) return next(new AppError("order with that id not found", 404));
      if (order.status == "Pending") return next(new AppError("Pending order not supported", 400));
      let action = req.body.action; // complete or cancel

      var client_email = order.delivery_address.email;
      var order_status = 'Processing'
      if(action === 'complete' && order.status === 'Processing'){
        order_status = 'Completed'
        let email_body = `<p>Hello there, Your order <strong>#${order.order_number}</strong> has been completed and ready for pickup</p>`
        await send_email(client_email, "Order Complete", email_body);
      }
      else if(action == 'reverse' && order.status === 'Completed'){
        let email_body = `<p>Hello there, if you received an email about completion of order <strong>#${order.order_number}</strong>, please disregard it as the order is still being processed</p>`
        await send_email(client_email, "Order still being processed", email_body);
      }
      const updated = await Order.findByIdAndUpdate(order_id, {status: order_status}, {
        new: true,
        runValidators: true
      });
      if (!updated) return next(new AppError("order with that id not found", 404));
      await appendOrder('Updated', updated);
      var result = await Order.findById(order_id).populate('delivery_shop').populate('racquet'); 
      var json = result.toJSON();

      json.racquet.mains.string_id = (await String.findById(result.racquet.mains.string_id)).toJSON();
      json.racquet.crosses.string_id = (await String.findById(result.racquet.crosses.string_id)).toJSON()
      res.status(200).json({
        status: 'Success',
        order: json,
      });
    } catch (err) {
      next(new AppError(err.message, 500));
    }

}

async function send_email(email, subject, body) {
  let user = {
    email: email,
    full_name: ''
  };
  await new Email(user, '', '').send(body, subject);
}