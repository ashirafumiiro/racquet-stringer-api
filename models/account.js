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

var AccountSchema = new Schema(
  {
    uuid : {type: String, default: uuid},
    full_name :{type: String, required: true},
    email: {type: String, required: true, unique: true},
    password :{type: String},
    address: { street :{type: String}, city:{type: String}, state:{type: String}, zip_code:{type: Number},
              apartment:{type: String}},
    country :{type: String},
    phone :{type: String},
    provider :{type: String},
    role :{type: String, enum: []},
    enabled : {type: Boolean},
    created : {type: Date},
    updated : {type: Date},
    shop :{type: Schema.Types.ObjectId, ref: 'Shop', required: false}
  }, opts
);

AccountSchema.virtual('id').get(function () {
  return '' + this._id;
});

AccountSchema.pre("save", async function (next) {
  const currentDate = new Date();
  this.updated = currentDate;
  next();
});

module.exports = mongoose.model('Account', AccountSchema);

