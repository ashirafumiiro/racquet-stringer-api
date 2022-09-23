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

var StringSchema = new Schema({
  uuid: {type: String, default: uuid, unique: true},
  name: {type: String, required: true, default: 'N/A'},
  type: {type: String},
  brand: {type: String},
  model: {type: String},
  size: {type: Number},
  price: {type: Number},
  enabled: {type: Boolean},
  shop: {type: Schema.Types.ObjectId, ref: 'Shop', required: false},
  created: {type: Date},
  updated: {type: Date},
  hybrid_type: { type: String, enum:["Reel",'Packet','Both']},
  in_stock: {type: Boolean},
  tension: {type: Number},
  hybrid: {type: Boolean, default: false}
}, opts);

StringSchema.virtual('id').get(function () {
  return '' + this._id;
});

StringSchema.pre("save", async function (next) {
  const currentDate = new Date();
  this.updated = currentDate;
  next();
});
module.exports = mongoose.model('String', StringSchema);