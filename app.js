require('dotenv').config()
var express = require('express');
var path = require('path');
var logger = require('morgan');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const errorHandler = require("./controllers/errorController");
const verifyApiKey = require('./middleware/check_api_key');

var accounts = require('./routes/accountRouter');
var racquets = require('./routes/racquetRouter');
var shops = require('./routes/shopRouter');
var orders = require('./routes/ordersRouter');
var profiles = require('./routes/profileRouter');
var strings = require('./routes/stringRouter');
var auth = require('./routes/authRouter');
var catalog =  require('./routes/catalogRouter');
var protect = require('./controllers/authController').protect;

var app = express();

var mongoDB = process.env.DATABASE_URL;
mongoose.connect(mongoDB, { useNewUrlParser: true , useUnifiedTopology: true}, function (err) {
    if(!err) {
      console.log("connected to Mongo DB");
    }
    else{
      console.log("connection to Mongo DB failed");
    }
      
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser())

app.use(verifyApiKey);
app.use('/api/v1/auth', auth);
app.use(protect)
app.use('/api/v1/catalog', catalog)
app.use('/api/v1/accounts', accounts);
app.use('/api/v1/racquets', racquets);
app.use('/api/v1/shops', shops);
app.use('/api/v1/orders', orders);
app.use('/api/v1/profiles', profiles);
app.use('/api/v1/strings', strings);


app.use("*", (req, res) => {
  res.status(404).json({
      status: "error end point not found",
      message: req.originalUrl,
  });
});


app.use(errorHandler);
module.exports = app;
