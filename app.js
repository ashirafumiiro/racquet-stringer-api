require('dotenv').config()
var express = require('express');
var path = require('path');
const cors = require("cors");
var logger = require('morgan');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const errorHandler = require("./controllers/errorController");
const verifyApiKey = require('./middleware/check_api_key');
const { checkMaintenanceMode } = require('./controllers/siteSettingsController');
const shopController = require('./controllers/shopController')
const surveyController = require('./controllers/surveyController')

var accounts = require('./routes/accountRouter');
var racquets = require('./routes/racquetRouter');
var shops = require('./routes/shopRouter');
var orders = require('./routes/ordersRouter');
var profiles = require('./routes/profileRouter');
var strings = require('./routes/stringRouter');
var auth = require('./routes/authRouter');
var catalog =  require('./routes/catalogRouter');
var settings = require('./routes/siteSettingsRouter');
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

// cors
app.use(
  cors({
      credentials: true,
  })
);
app.all("*", cors());
app.options("*", cors());
app.use(logger('dev'));
// requires raw unparsed body to work.
app.post('/api/v1/stripe-update', express.raw({type: 'application/json'}), shopController.stripe_webhook); // for account
app.post('/api/v1/stripe-update2', express.raw({type: 'application/json'}), shopController.stripe_webhook2); // for connected accounts
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser())

app.use(verifyApiKey);
app.use('/api/v1/site-settings', settings)
app.use(checkMaintenanceMode);
app.use('/api/v1/auth', auth);
//app.use(protect)
app.use('/api/v1/catalog', catalog)
app.use('/api/v1/accounts', accounts);
app.use('/api/v1/racquets', racquets);
app.use('/api/v1/shops', shops);
app.use('/api/v1/orders', orders);
app.use('/api/v1/profiles', profiles);
app.use('/api/v1/strings', strings);
app.post('/api/v1/survey', surveyController.create_survey);


app.use("*", (req, res) => {
  res.status(404).json({
      status: "error end point not found",
      message: req.originalUrl,
  });
});


app.use(errorHandler);
module.exports = app;
