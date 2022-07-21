var mongoose = require('mongoose');

const Schema = mongoose.Schema;

var OTPSchema = new Schema({
    email: {type: String, required: true, unique: true},
    otp: { type: Number, default: 0 }
  });

module.exports = mongoose.model('OTP', OTPSchema);