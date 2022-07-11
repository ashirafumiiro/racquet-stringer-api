var Racquet = require('../models/racquet');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');

exports.racquet_list = function(req, res, next) {
    Racquet.find({})
    .sort({model : 1})
    .populate('account')
    .exec(function (err, list_racquets) {
      if (err) { return next(err); }
      //Successful, so render
      res.status(200).json({
        status: 'Success',
        results: list_racquets.length,
        list_racquets: list_racquets
      });
    });
  };

exports.getOneRacquet = async function (req, res, next) {
  try{
    const racquet = await Racquet.findById(req.params.id).populate('account'); 
    if (!racquet) return next(new AppError("racquet with that id not found", 404))

    res.status(200).json({
        status: 'Success',
        racquet: racquet,
    });
  }
  catch(err){
      next(new AppError(err.message, 500));
  }
}

exports.createRacquet = [
   // Validate and sanitize fields.
   body('brand', 'brand must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('model', 'model must not be empty.').trim().isLength({ min: 1 }).escape(),
   body('brand', 'brand must not be empty.').trim().isLength({ min: 1 }).escape(),

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
              const newRacquet = await Racquet.create({ ...req.body, created: Date.now() });

              res.status(200).json({
                  status: 'Success',
                  racquet: newRacquet,
              });
           } catch (err) {
            next(new AppError(err.message, 500));
           }
           
       }
   }
]

exports.updateRacquet = [
    // Validate and sanitize fields.
    body('brand', 'brand must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('model', 'model must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('brand', 'brand must not be empty.').trim().isLength({ min: 1 }).escape(),

   async (req, res, next) => {
        try{
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
        catch(err){
          next(new AppError(err.message, 500));
        }       
  }
];
  
exports.deleteRacquet = async (req, res, next) => {
  try{
    const racquet = await Racquet.findByIdAndDelete(req.params.id)
    if (!racquet) return next(new AppError("racquet with that id not found", 404))
  
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