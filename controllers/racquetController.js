var Racquet = require('../models/racquet');
var Order = require('../models/service_order');
const AppError = require("../utils/AppError");
const { body, validationResult } = require('express-validator');
const { appendRacquet } = require('../utils/google-sheet-write');
const uuid = require("uuid").v4;
const mongoose = require('mongoose');

exports.racquet_list = function (req, res, next) {
  Racquet.find({})
    .sort({ model: 1 })
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
  try {
    let racquet;
    const type = req.query.type
    if (type && type === 'uuid') {
      racquet = await Racquet.findOne({ uuid: req.params.id }).populate('mains.string_id')
        .populate('crosses.string_id');
    }
    else {
      racquet = await Racquet.findById(req.params.id).populate('mains.string_id')
        .populate('crosses.string_id');
    }

    if (!racquet) return next(new AppError("racquet with that id not found", 404))

    res.status(200).json({
      status: 'Success',
      racquet: racquet,
    });
  }
  catch (err) {
    next(new AppError(err.message, 500));
  }
}

exports.createRacquet = [
  // Validate and sanitize fields.
  body('brand', 'brand must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('model', 'model must not be empty.').trim().isLength({ min: 1 }).escape(),

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
        const newRacquet = await Racquet.create({ ...req.body, created: Date.now(), uuid: uuid() });
        await appendRacquet("Created", newRacquet);
        const racquet = await Racquet.findById(newRacquet._id).populate('mains.string_id')
          .populate('crosses.string_id');
        res.status(200).json({
          status: 'Success',
          racquet: racquet,
        });
      } catch (err) {
        next(new AppError(err.message, 500));
      }

    }
  }
]

exports.updateRacquet = async (req, res, next) => {
  try {
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
  catch (err) {
    next(new AppError(err.message, 500));
  }
};

exports.deleteRacquet = async (req, res, next) => {
  try {
    const racquet = await Racquet.findByIdAndDelete(req.params.id)
    if (!racquet) return next(new AppError("racquet with that id not found", 404))

    res.status(204).json({
      status: 'Success',
      data: {
        data: null
      },
    });
  }
  catch (err) {
    next(new AppError(err.message, 500));
  }

};


exports.getOneByQrCode = async function (req, res, next) {
  try {
    const racquet = await Racquet.findOne({ qr_code: req.params.code }).populate('mains.string_id')
      .populate('crosses.string_id');;
    if (!racquet) return next(new AppError("racquet with that qr_code not found", 404))

    const orders = await Order.find({ racquet: racquet._id }).sort({ created: -1 }).exec();
    let recentOrder = null;
    if (orders.length > 0) {
      recentOrder = orders[0].toJSON()
      recentOrder.racquet = racquet
    };

    res.status(200).json({
      status: 'Success',
      racquet: racquet,
      order: recentOrder
    });
  }
  catch (err) {
    next(new AppError(err.message, 500));
  }
}

exports.getOneByValue = async function (req, res, next) {
  try {
    const value = req.params.value
    if (!value) return next(new AppError("search value is needed", 400))

    let racquet = await Racquet.findOne({ qr_code: value }).populate('mains.string_id')
      .populate('crosses.string_id');

    if (!racquet && mongoose.isValidObjectId(value)) racquet = await Racquet.findById(value).populate('mains.string_id')
      .populate('crosses.string_id');

    if (!racquet) racquet = await Racquet.findOne({ uuid: value }).populate('mains.string_id')
      .populate('crosses.string_id');

    if (racquet) {
      const orders = await Order.find({ racquet: racquet._id }).sort({ created: -1 }).exec();
      let recentOrder = null;
      if (orders.length > 0) {
        recentOrder = orders[0].toJSON()
        recentOrder.racquet = racquet
      };

      return res.status(200).json({
        status: 'Success',
        racquet: racquet,
        order: recentOrder
      });
    }

    return next(new AppError("No result found", 404))
  }
  catch (err) {
    next(new AppError(err.message, 500));
  }
}