var Order = require('../models/service_order');
var Strings = require('../models/string');
var Shop = require('../models/shop');
var Racquet = require('../models/racquet');
var Account = require('../models/account');
const { createToken } = require('../controllers/authController');
const stripe_utils = require('../utils/stripe-utils');

const { appendAccount, appendOrder, appendShop} = require('../utils/google-sheet-write');

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
        try{
          // Extract the validation errors from a request.
            const errors = validationResult(req);

            // Create a Raquet object with escaped and trimmed data.

            if (!errors.isEmpty()) {
                // There are errors. Render form again with sanitized values/error messages.
                  var firstError = (errors.array())[0]
                return next(new AppError(firstError.msg, 400));
            }

            let email = req.body.email;
            
            const existing = await Account.findOne({email: email}).exec();
            console.log("Exiting:", existing);
            if (existing) return next(new AppError("Email already taken", 400))
            let newAccount = await Account.create({
                 email: email,
                 password: req.body.password, 
                 created: Date.now(),
                 full_name: req.body.first_name +' '+  req.body.last_name 
            });

            if(!newAccount) return next(new AppError("Failed to create account", 500))
            var shop = await Shop.create({
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
            if(!shop) return next(new AppError("Failed to save shop", 500))
            newAccount = await Account.findByIdAndUpdate(newAccount._id, {shop: shop._id}, {
              new: true,
              runValidators: true
              });
            
            // register in stripe
            var stripe_customer = await stripe_utils.create_customer(shop.name, shop.email, shop.uuid);
            if(stripe_customer && stripe_customer.id){
                shop = await Shop.findByIdAndUpdate(shop._id, {stripe_customer_id: stripe_customer.id},{
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
        catch(err){
          next(new AppError(err.message, 500));
        }       
  }
]

exports.editShopSettings = async (req, res, next) => {
  try{
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
  catch(err){
    next(new AppError(err.message, 500));
  }       
};

exports.createOrder = [
    // Validate and sanitize fields.
    body('string_id', 'string_id must not be empty.').trim().isLength({ min: 5 }).withMessage("string_id too short").escape(),
    body('racquet_id', 'racquet_id must not be empty.').trim().isLength({ min: 5 }).withMessage("racquet_id too short").escape(),
    body('shop_id', 'shop_id must not be empty.').trim().isLength({ min: 5 }).withMessage("shop_id too short").escape(),
    body('firs_name', 'firs_name must not be empty.').trim().isLength({ min: 1 }).escape(),
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

        try{

          const string = await Strings.findById(req.body.string_id);
            if (!string) return next(new AppError("String with that id not found", 404))

          const racquet = await Racquet.findById(req.body.racquet_id);
          if (!racquet) return next(new AppError("Racquet with that id not found", 404))

          const shop = await Shop.findById(req.body.shop_id).populate('created_by');
          if (!shop) return next(new AppError("Shop with that id not found", 404));

          if (shop.stripe_status !== 'enabled') return next(new AppError("Shop with that is not enabled in stripe", 400));

          var newOrder = await Order.create({
            account: shop.created_by._id,
            racquet: req.body.racquet_id,
            string: req.body.string_id,
            use_hybrid_settings: req.body.use_hybrid_settings || false,
            due_on: req.body.due_on,
            amount: req.body.amount,
            status: "Pending",
            delivery_shop: req.body.shop_id,
            delivery_address: {
              first_name: req.body.first_name, 
              last_name: req.body.last_name, 
              phone_number: req.body.phone_number
            },
            created: new Date()
          });
          await appendOrder("Created", newOrder);
            res.status(200).json({
              status: 'Success',
              newOrder: newOrder,
            });
        }
        catch(err){
          next(new AppError(err.message, 500));
        }       
  }
]

exports.getOrders = async function (req, res, next) {
    try{
      var completed = req.query.completed === "true";
      console.log('completed:', completed);
      const shop = await Shop.findById(req.params.id);
      if (!shop) return next(new AppError("shop with that id not found", 404))

      var orders_query = Order.find(); 
      if(completed){
        orders_query = Order.find({status: "Completed"});
      }
      
      
      const orders = await orders_query.populate("string").populate("racquet");
      res.status(200).json({
          status: 'Success',
          order: orders,
      });
    }
    catch(err){
        next(new AppError(err.message, 500));
    }
  }

  
  exports.getInventory = async function (req, res, next) {
    try{
      console.log('shop_id', req.params.id);
      const shop = await Shop.findById(req.params.id);
      if(!shop) next(new AppError("a shop with the specified id does not exist"));
      let model = req.params.search || '';
      var strings_query = Strings.find(); 
      if(req.query.search){
        strings_query = Strings.find({model: req.query.search});
      }
      const strings = await strings_query;
  
      res.status(200).json({
          status: 'Success',
          results: strings.length,
          inventory: strings,
      });
    }
    catch(err){
        next(new AppError(err.message, 500));
    }
  };