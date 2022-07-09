require('dotenv').config()
var express = require('express');
var path = require('path');
var logger = require('morgan');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const errorHandler = require("./controllers/errorController");

var accounts = require('./routes/accountRouter');
var racquets = require('./routes/racquetRouter');

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

app.use('/accounts', accounts);
app.use('/racquets', racquets);

app.use("*", (req, res) => {
  res.status(404).json({
      status: "error end point not found",
      message: req.originalUrl,
  });
});


app.use(errorHandler);
module.exports = app;
