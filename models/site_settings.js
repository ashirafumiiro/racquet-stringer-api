const mongoose = require('mongoose');
var opts = {
  toJSON: {
    virtuals: true,
    transform: (doc, ret, options) => {
      delete ret.__v;
      ret.id = ret._id.toString();
      delete ret._id;
    },
  },
  toObject: { virtuals: true },
  versionKey: false,
};

const Schema = mongoose.Schema;

var SiteSettingsSchema = new Schema({
  maintenanceMode: {type: Boolean},
  stripeDashboardUrl: {type: String},
  googleRecaptchaV3Key: {type: String}, 
  ipLimiterLoginNumber: {type: Number}, //number of wrong logins possible during  ipLimiterLoginSeconds
  ipLimiterLoginIntervalSeconds: {type: Number}, //interval after ipLimiterLoginNumber
  ipLimiterLoginSeconds: {type: Number}, //duration for which wrong logins can be retried
  ipLimiterForgotPasswordNumber: {type: Number}, //number of password resets possible during  ipLimiterForgotPasswordSeconds)
  ipLimiterForgotPasswordIntervalSeconds: {type: Number}, //(interval after ipLimiterForgotPasswordNumber)
  ipLimiterForgotPasswordSeconds: {type: Number} //(duration for which passwords can be reset)
}, opts);

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);