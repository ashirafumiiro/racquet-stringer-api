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

var RacquetSchema = new Schema({
  uuid : {type: String, default: uuid},
  brand: {type: String},
  model: {type: String},
  image_url: {type: String},
  qr_code: {type: String},
  mains: { string_id: {type: Schema.Types.ObjectId, ref: 'String'}, 
                  tension: Number, unit: Number, new_tension: Number},
  crosses: {string_id: {type: Schema.Types.ObjectId, ref: 'String'}, 
                  tension: Number, unit: Number, new_tension: Number},
  vibration_dampener: {type: String},
  grip_brand: {type: String},
  grip_model: {type: String},
  grip_hand: {type: String},
  created: {type: Date},
  updated: {type: Date},
  sport: { type: String, enum: ['Tennis', 'Squash', 'Badminton', 'Other']},
  owner: {type: String, default: ''}
}, opts);

RacquetSchema.virtual('id').get(function () {
  return '' + this._id;
});

RacquetSchema.pre("save", async function (next) {
  const currentDate = new Date();
  this.updated = currentDate;
  next();
});

module.exports = mongoose.model('Racquet', RacquetSchema);