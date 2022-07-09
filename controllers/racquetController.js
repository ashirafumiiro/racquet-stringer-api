var Racquet = require('../models/racquet');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');

exports.racquet_list = function(req, res, next) {
    Racquet.find({})
    .sort({full_name : 1})
    .populate('account')
    .exec(function (err, list_rackets) {
      if (err) { return next(err); }
      //Successful, so render
      res.status(200).json({
        status: 'Success',
        results: list_rackets.length,
        rackets
      });
    });
  };

exports.getOneRacquet = async function (req, res, next) {
  const racquet = await Racquet.findById(req.params.id).populate('account');
  if (!racquet) return next(new AppError("racquet with that id not found", 404))

  res.status(200).json({
      status: 'Success',
      racquet: racquet,
  });
}

exports.createRacquet = [
   // Validate and sanitize fields.
   body('brand', 'Brand must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('model', 'model must not be empty.').trim().isLength({ min: 1 }).escape(),

   // Process request after validation and sanitization.
   async (req, res, next) => {

       // Extract the validation errors from a request.
       const errors = validationResult(req);

       // Create a Raquet object with escaped and trimmed data.
       var racquet = new Racquet(
        { 
            account: req.body.account,
            brand: req.body.brand,
            model: req.body.model,
            image_url: req.body.image_url,
            qr_code: req.body.qr_code,
            mains: req.body.mains,
            crosses: req.body.crosses,
            vibration_dampener: req.body.vibration_dampener,
            grip_brand: req.body.grip_brand,
            grip_model: req.body.grip_model,
            grip_hand: req.body.grip_hand,
            created: req.body.created,
            updated: req.body.updated,
            sport: req.body.sport
        });

       if (!errors.isEmpty()) {
           // There are errors. Render form again with sanitized values/error messages.
            var firstError = (errors.array())[0]
           return;
       }
       else {
           // Data from form is valid. Save racquet.
           const barcode = await Barcode.findOne({ uuid,  })
             if (!barcode) return next(new AppError("barcode with that uuid not found or barcode doesnt not match with  user", 404))

           const newCheckout = await Checkout.create({ ...req.body, user_id: user_id, created: Date.now() });

            res.status(200).json({
                status: 'Success',
                checkOut: newCheckout,
            });
       }
   }
]

exports.updateRacquet = [
    // Validate and sanitize fields.
   body('brand', 'Brand must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('model', 'model must not be empty.').trim().isLength({ min: 1 }).escape(),
   async (req, res, next) => {
        const racquet = await Racquet.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
        })
        if (!racquet) return next(new AppError("Racquet with that id not found", 404))
    
        res.status(200).json({
        status: 'Success',
        racquet: racquet,
        });
  }
];
  
exports.deleteRacquet = async (req, res, next) => {
    const racquet = await Racquet.findByIdAndDelete(req.params.id)
    if (!racquet) return next(new AppError("racquet with that id not found", 404))
  
    res.status(204).json({
      status: 'Success',
      data: {
        data: null
      },
    });
};