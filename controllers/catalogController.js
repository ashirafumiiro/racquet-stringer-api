var Order = require('../models/service_order');
var Strings = require('../models/string');
var Shop = require('../models/shop');
var Racquet = require('../models/racquet');
var Account = require('../models/account');
const { createToken } = require('../controllers/authController');
const stripe_utils = require('../utils/stripe-utils');
const ordersController = require('./ordersController');
const Email = require('../utils/email');
const uuid = require("uuid").v4;
const twilio_utils = require('../utils/twilio-utils');
const mongoose = require('mongoose');

const { appendAccount, appendOrder, appendShop } = require('../utils/google-sheet-write');

const AppError = require("../utils/AppError");
const { body, validationResult, query } = require('express-validator');

exports.registerBusiness = [
  // Validate and sanitize fields.
  body('first_name', 'first_name must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('last_name', 'last_name must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('phone', 'phone must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('shop_name', 'shop_name must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('email', 'email must be a valid email address.').trim().isLength({ min: 1 }).escape().isEmail(),
  body('password', 'password must not be empty.').trim().isLength({ min: 1 }).escape(),

  async (req, res, next) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a Raquet object with escaped and trimmed data.

      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/error messages.
        var firstError = (errors.array())[0]
        return next(new AppError(firstError.msg, 400));
      }

      let email = req.body.email;

      const existing = await Account.findOne({ email: email }).exec();
      console.log("Exiting:", existing);
      if (existing) return next(new AppError("Email already taken", 400))
      let newAccount = await Account.create({
        email: email,
        password: req.body.password,
        created: Date.now(),
        full_name: req.body.first_name + ' ' + req.body.last_name,
        uuid: uuid()
      });

      if (!newAccount) return next(new AppError("Failed to create account", 500))
      var shop = await Shop.create({
        uuid: uuid(),
        name: req.body.shop_name,
        address: {
          street: req.body.street,
          city: req.body.city,
          state: req.body.state,
          zip_code: req.body.zip_code,
          apartment: req.body.apartment
        },
        created_by: newAccount._id,
        created: new Date(),
        phone: req.body.phone,
        email: email,
        country: req.body.country
      });
      if (!shop) return next(new AppError("Failed to save shop", 500))
      newAccount = await Account.findByIdAndUpdate(newAccount._id, { shop: shop._id }, {
        new: true,
        runValidators: true
      });

      // register in stripe
      var stripe_customer = await stripe_utils.create_customer(shop.name, shop.email, shop.uuid);
      if (stripe_customer && stripe_customer.id) {
        shop = await Shop.findByIdAndUpdate(shop._id, { stripe_customer_id: stripe_customer.id }, {
          new: true,
          runValidators: true
        });
      }
      await appendAccount("Created", newAccount);
      await appendShop("Created", shop);
      shop = await Shop.findById(shop._id).populate("created_by");

      const expirationTime = new Date(
        Date.now() + process.env.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000
      );
      const expiresIn = process.env.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000;
      const token = createToken(newAccount._id);

      res.status(200).json({
        status: 'Success',
        shop: shop,
        expirationTime,
        expiresIn,
        token
      });

    }
    catch (err) {
      next(new AppError(err.message, 500));
    }
  }
]

exports.editShopSettings = async (req, res, next) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    if (!shop) return next(new AppError("Order with that id not found", 404))

    res.status(200).json({
      status: 'Success',
      account: shop,
    });
  }
  catch (err) {
    next(new AppError(err.message, 500));
  }
};

exports.createOrder = [
  // Validate and sanitize fields.
  // body('email', 'email must be a valid email address.').trim().isLength({ min: 2 }).withMessage("email too short").escape().isEmail(),
  body('racquet_id', 'racquet_id must not be empty.').trim().isLength({ min: 5 }).withMessage("racquet_id too short").escape(),
  body('shop_id', 'shop_id must not be empty.').trim().isLength({ min: 5 }).withMessage("shop_id too short").escape(),
  body('first_name', 'first_name must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('last_name', 'last_name must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('phone_number', 'phone_number must not be empty.').trim().isLength({ min: 4 }).withMessage("phone_number too short").escape(),

  async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Raquet object with escaped and trimmed data.

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.
      var firstError = (errors.array())[0]
      return next(new AppError(firstError.msg, 400));
    }

    try {

      const racquet = await Racquet.findById(req.body.racquet_id).populate('mains.string_id')
        .populate('crosses.string_id');
      if (!racquet) return next(new AppError("Racquet with that id not found", 404))

      const shop = await Shop.findById(req.body.shop_id).populate('created_by');
      if (!shop) return next(new AppError("Shop with that id not found", 404));

      if (shop.stripe_status !== 'enabled') return next(new AppError("Shop with that is not enabled in stripe", 400));
      const tax = shop.tax || 0;
      const labor_price = shop.labor_price;
      let mains_string = racquet.mains.string_id;
      let string_cost = 0;
      if (mains_string.hybrid_type == "Reel") {
        string_cost = mains_string.price / 2;
      }
      else {
        string_cost = mains_string.price;
      }

      let crosses_string = racquet.crosses.string_id;
      if (crosses_string.hybrid_type == "Reel") {
        string_cost += crosses_string.price / 2;
      }
      else {
        string_cost += crosses_string.price;
      }


      if (!shop.estimated_delivery_time) {
        throw new Error('No estimated delivery_time for shop');
      }

      let due_on = new Date();
      due_on.setDate(due_on.getDate() + shop.estimated_delivery_time);

      let amount = string_cost + tax + labor_price;
      console.log('Order Cost items:', { string_cost, tax, labor_price });

      var newOrder = await Order.create({
        shop: shop._id,
        racquet: req.body.racquet_id,
        due_on: due_on,
        amount: amount,
        status: "Pending",
        delivery_shop: req.body.shop_id,
        delivery_address: {
          first_name: req.body.first_name,
          email: req.body.email || '',
          last_name: req.body.last_name,
          phone_number: req.body.phone_number
        },
        created: new Date(),
        uuid: uuid()
      });
      await appendOrder("Created", newOrder);
      let order_number = newOrder.order_number;

      const order = await Order.findById(newOrder._id).populate('delivery_shop').populate('racquet')
        .populate('racquet.mains.string_id').populate('racquet.crosses.string_id');
      if (!order) return next(new AppError("order with that id not found", 404))
      var json = order.toJSON();

      json.racquet.mains.string_id = (await Strings.findById(order.racquet.mains.string_id)).toJSON();
      json.racquet.crosses.string_id = (await Strings.findById(order.racquet.crosses.string_id)).toJSON()

      await new Email({ email: shop.email }, '', '').shopOrderConfirm(json);
      //await new Email({email: req.body.email}, '', '').custormerOrderConfirm(shop.name, order_number);

      let client_msg = `${req.body.first_name} ${req.body.last_name}, your order was successfully submitted through RacquetPass! Make sure to drop it off at ${shop.name}. View details at https://racquetpass.web.app/order/${newOrder._id}`;
      await twilio_utils.sendMessage(req.body.phone_number, client_msg);

      const url = await ordersController.get_checkout_session(order);
      res.status(200).json({
        status: 'Success',
        url: url,
      });
    }
    catch (err) {
      next(new AppError(err.message, 500));
    }
  }
]

exports.getOrders = async function (req, res, next) {
  try {
    var completed = req.query.completed === "true";
    console.log('completed:', completed);
    const shop = await Shop.findById(req.params.id);
    if (!shop) return next(new AppError("shop with that id not found", 404))

    var orders_query = Order.find({ delivery_shop: shop._id });
    if (completed) {
      orders_query = Order.find({ delivery_shop: shop._id, status: "Completed" });
    }


    const orders = await orders_query.populate("racquet").populate('racquet.mains.string_id')
      .populate('racquet.crosses.string_id');

    let curr = new Date();
    // let todayStart = todayDate = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate()-1,0,0,0);
    // let todayEnd= todayDate = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(),0,0,0);
    var todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    var todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);


    var weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

    let data = {
      dueToday: orders.filter(order => order.due_on >= todayStart && order.due_on <= todayEnd),
      dueThisWeek: orders.filter(order => order.due_on >= weekAgo && orders.due_on <= todayStart),
      others: orders.filter(order => order.due_on < weekAgo || order.due_on > todayEnd)
    }
    res.status(200).json({
      status: 'Success',
      order: data,
    });
  }
  catch (err) {
    next(new AppError(err.message, 500));
  }
}

exports.getInventory = async function (req, res, next) {
  try {
    console.log('shop_id', req.params.id);
    const shop = await Shop.findById(req.params.id);
    if (!shop) next(new AppError("a shop with the specified id does not exist"));
    let model = req.params.search || '';
    var strings_query = Strings.find({ shop: shop._id });
    if (req.query.search) {
      strings_query = Strings.find({ shop: shop._id, model: req.query.search });
    }
    const strings = await strings_query;

    res.status(200).json({
      status: 'Success',
      results: strings.length,
      inventory: strings,
    });
  }
  catch (err) {
    next(new AppError(err.message, 500));
  }
};

exports.search = async function (req, res, next) {
  try {
    const value = req.params.value
    console.log('Search values: ', value)
    const sendResponse = (obj, type) => {
      return res.status(200).json({
        status: 'Success',
        order: obj,
      });
    };

    if (!value) return next(new AppError("search value is needed", 400))
 
    let order;
    if(mongoose.isValidObjectId(value)){
      order = await Order.findById(value).populate('racquet').populate('delivery_shop');
    }
    else{
      order = await Order.findOne({ uuid: value }).populate('racquet').populate('delivery_shop');
    }
    

    //below timesout and not performant
    // let order = await Order.findOne({$or: [{ uuid: value }, { _id: new ObjectId(value) }]}).populate('racquet');
    if (order) {
      let obj = order.toJSON();
      let rac_id = obj.racquet.id;
      obj.racquet = await Racquet.findById(rac_id).populate('mains.string_id').populate('crosses.string_id')
      return sendResponse(obj, 'order');
    }

    //combined query is less performat and takes too long
    let racquet = await Racquet.findOne({ qr_code: value }).populate('mains.string_id')
      .populate('crosses.string_id');

    if (!racquet && mongoose.isValidObjectId(value)) racquet = await Racquet.findById(value).populate('mains.string_id')
      .populate('crosses.string_id');

    console.log('searchin racquet by uuid');
    if (!racquet) racquet = await Racquet.findOne({ uuid: value }).populate('mains.string_id')
      .populate('crosses.string_id');



    if (racquet) {
      const orders = await Order.find({ racquet: racquet._id }).sort({ created: -1 }).populate('delivery_shop').exec();
      if (orders.length > 0) {
        let order = orders[0].toJSON();
        order.racquet = racquet
        return sendResponse(order, 'order')
      }
    }

    return next(new AppError("No result found", 404))
  } catch (error) {

  }
}