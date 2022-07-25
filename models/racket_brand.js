var mongoose = require('mongoose');
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

var RacquetBrandSchema = new Schema({
  name: {type: String, required: true, unique: true},
}, opts);

RacquetBrandSchema.virtual('id').get(function () {
  return '' + this._id;
});


module.exports = mongoose.model('RacquetBrand', RacquetBrandSchema);