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

var ShopRequestSchema = new Schema({
  shop_name: {type: String, required: true},
  city: {type: String},
  state: {type: String}, 
  phone: {type: Number, required: true},
  search: {type: String},
  active: {type: Boolean, default: true},
  created: {type: Date}
}, opts);

ShopRequestSchema.virtual('id').get(function () {
    return '' + this._id;
});
  
ShopRequestSchema.pre("save", async function (next) {
    const currentDate = new Date();
    this.created = currentDate;
    next();
  });
  

module.exports = mongoose.model('ShopRequests', ShopRequestSchema);