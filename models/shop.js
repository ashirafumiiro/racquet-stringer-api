var mongoose = require('mongoose');
const uuid = require("uuid").v4();
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

var ShopSchema = new Schema({
  uuid : {type: String, default: uuid},
  name: {type: String, required: true},
  country: {type: String, required: true},
  address: {street: {type: String}, city: {type: String}, state: {type: String}, zip_code: {type: Number}, apartment:{type: String}},
  email: {type: String, required: true},
  phone: {type: String},
  enabled: {type: Boolean},
  created: {type: Date},
  updated: {type: Date},
  created_by: {type: Schema.Types.ObjectId, ref: 'Account', required: true},
  etimated_delivery_time: {type: Number}, // in days
  labor_price: {type: Number}, 
  allow_own_strings: {type: Boolean}
}, opts);

ShopSchema.virtual('id').get(function () {
  return '' + this._id;
});

ShopSchema.pre("save", async function (next) {
  const currentDate = new Date();
  this.updated = currentDate;
  next();
});

module.exports = mongoose.model('Shop', ShopSchema);
