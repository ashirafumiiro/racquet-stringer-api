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

var ProfileSchema = new Schema({
  uuid: {type: String, default: uuid},
  account: {type: Schema.Types.ObjectId, ref: 'Account', required: true},
  birthday: {type: Date},
  playing_level: {type: String},
  playing_hand: {type: String},
  playing_style: {type: String},
  hitting_style: {type: String},
  pro_player_style_twin: {type: String},
  created: {type: Date},
  updated: {type: Date}
}, opts);

ProfileSchema.virtual('id').get(function () {
  return '' + this._id;
});

ProfileSchema.pre("save", async function (next) {
  const currentDate = new Date();
  this.updated = currentDate;
  next();
});


module.exports = mongoose.model('Profie', ProfileSchema);