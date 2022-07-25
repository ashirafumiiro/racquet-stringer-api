var mongoose = require('mongoose');
const Counter = require('./counter');
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

var ServiceOrderSchema = new Schema({
  uuid: {type: String, default: uuid, unique: true},
  account: {type: Schema.Types.ObjectId, ref: 'Account', required: false},
  racquet: {type: Schema.Types.ObjectId, ref: 'Racquet', required: true},
  due_on: {type: Date},
  amount: {type: Number},
  payment_gateway_id: {type: Number},
  transaction_id: {type: Number},
  status: {type: String, enum: ["Pending", "Processing", "Completed"]},
  type: {type: String}, 
  delivery_type: String,
  delivery_shop: {type: Schema.Types.ObjectId, ref: 'Shop', required: true},
  delivery_address: {first_name: String, last_name: String, phone_number: String, email: String},
  delivery_date: {type: Date},
  created: {type: Date},
  updated: {type: Date},
  order_number: {type: Number, unique: true}  
}, opts);

ServiceOrderSchema.virtual('id').get(function () {
  return '' + this._id;
});

ServiceOrderSchema.pre("save", async function (next) {
  const currentDate = new Date();
  this.updated = currentDate;
  if(this.order_number){
    next();
  }
  else{
    console.log('saving order_number ....')
    let count_obj = await Counter.findOne({});
    if(!count_obj){
      count_obj = await Counter.create({seq: 1});
    }
    let count = count_obj.seq;
    this.order_number = count;
    const modified = await Counter.findByIdAndUpdate(count_obj._id, {seq: ++count}, {
      new: true,
      runValidators: true
      });
      next()
  }
});

module.exports = mongoose.model('ServiceOrder', ServiceOrderSchema);