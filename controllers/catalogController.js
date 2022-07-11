var Order = require('../models/service_order');
var Shop = require('../models/shop');
var Racquet = require('../models/racquet');
var Account = require('../models/account');

const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');

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
            let email = req.body.email;
            
            const existing = await Account.findOne({email: email}).exec();
            console.log("Exiting:", existing);
            if (existing) return next(new AppError("Email already taken", 400))
            const newAccount = await Account.create({
                 email: email,
                 password: req.body.password, 
                 created: Date.now(),
                 full_name: req.body.first_name + req.body.last_name 
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
            if(!shop) return next(new AppError("Failed to save user", 500))
            shop = await Shop.findById(shop._id).populate("created_by");

            res.status(200).json({
                status: 'Success',
                shop: shop,
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
        catch{
          next(new AppError(err.message, 500));
        }       
  }

exports.createOrder = [
    // Validate and sanitize fields.
    body('account', 'account must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('racquet', 'racquet must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('shop', 'shop must not be empty.').trim().isLength({ min: 1 }).escape(),

   async (req, res, next) => {
        try{
          const account = await Order.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
            })
            if (!account) return next(new AppError("Order with that id not found", 404))
        
            res.status(200).json({
            status: 'Success',
            account: account,
          });
        }
        catch{
          next(new AppError(err.message, 500));
        }       
  }
]

exports.getOrders = async function (req, res, next) {
    try{
      const order = await Order.findById(req.params.id).populate('shop'); 
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

  
  exports.getInventory = async function (req, res, next) {
    try{
      const order = await Order.findById(req.params.id).populate('shop'); 
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