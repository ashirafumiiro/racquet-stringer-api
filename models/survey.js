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

var SurveySchema = new Schema({
  competitiveRating: { type: Boolean },
  game: { type: String },
  ntrpRating: { type: Number },
  utrRating: { type: Number },
  usSquashRating: { type: Number }, 
  clubRating: { type: Number },
  experienceLevel: { type: String }, 
  email: {type: String},
  created: {type: Date}
}, opts);

module.exports = mongoose.model('Survey', SurveySchema);