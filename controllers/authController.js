var Account = require('../models/account');
const jwt = require('jsonwebtoken');
const { promisify } = require("util");
const AppError = require("../utils/AppError");
const { appendAccount } = require('../utils/google-sheet-write');
const crypto = require("crypto");
const Email = require('../utils/email');
const twilio_utils = require('../utils/twilio-utils');
const OTP = require('../models/otp');
const uuid = require("uuid").v4;


const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  };

const createSendToken = async (user, statusCode, res) => {
    const token = signToken(user._id);
  
    const expirationTime = new Date(
      Date.now() + process.env.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000
    );
    const expiresIn = process.env.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000;
  
    user.password = undefined;
  
    res.status(statusCode).json({
      status: "success",
      token,
      expiresIn,
      expirationTime,
      user,
    });
  };

exports.login = async (req, res, next) => {
    const { email, password } = req.body;
  
    // Checking if username exists
    if (!email || !password) {
      return next(new AppError('Please Provide Valid username or password', 404));
    }
    const user = await Account.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password'));
    }

    createSendToken(user, 200, res);
};

exports.adminSignUp = async (req, res, next) => {
    try {
        const existingAccount = await Account.findOne({ $or: [{ email: req.body.email }] });
        if (existingAccount) return next(new AppError("Email already in use", 400));
        
        var userToAdd = {
            email: req.body.email,
            password: req.body.password,
            role: 'Admin',
            full_name: req.body.full_name,
            uuid: uuid()
        }
        const newAdmin = await Account.create(userToAdd);

        console.log("Appending to excel");
        var result = await appendAccount("Created", newAdmin);
      
        createSendToken(newAdmin, 200, res);
    } catch (err) {
        next(new AppError(err.message, 500));
    }
  };
  
exports.protect = async (req, res, next) => {
    // 1) Getting token and check of it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
  
    if (!token) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }
    
    try{
      // 2) Verification token
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
      
        // 3) Check if user still exists
        const currentUser = await Account.findById(decoded.id);
        if (!currentUser) {
          return next(
            new AppError(
              "The user belonging to this token does no longer exist.",
              401
            )
          );
        }
      
        // 4) Check if user changed password after the token was issued
        
        // GRANT ACCESS TO PROTECTED ROUTE
        req.user = currentUser;
        res.locals.user = currentUser;
        next();  
    }
    catch(err){
      return next(
        new AppError(err.message, 401)
      );
    }
};

exports.createToken = signToken;

exports.forgotPassword = async (req, res, next) => {
  var user;
  try {
    user = await Account.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError("There is no account with email address.", 404));
    }

    const resetToken = user.createPasswordResetToken();
    user = await user.save({ validateBeforeSave: false });
    
    console.log("user is", user);

    const resetURL = `${process.env.BASE_URL}/reset-password/${resetToken}`;
    const subject = "Reset Password";
    const message = "Request for password reset";

    await new Email(user, subject, message).sendPasswordReset(resetURL);

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await Account.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Token is invalid or has expired", 400));
    }
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
  } catch (err) {
    console.log(err);
    return next(
      new AppError("Unable to perform action. Try again later!"),
      500
    );
  }
};
const emailBody1 = `
  <div>
    <p>Hey, you attempted to create an order at React Pass<p />
    <br/>
  <p>In this email, you'll find a one-time password that can be used to confirm your email.<p />
  <p>Thanks for using React Pass</p> 
  <p>One-time password: <b>`;

const emailBody2 = `
  </b> <p/>
  <br/>
  <p>- Admin <p />
  <p>p.s. please don't reply to this email, nobody checks it!  </p> 
  </div>`;

exports.sendOTP =  async (req, res, next) => {
    try {
      const twilio_res = await twilio_utils.sendSMSOTP(req.body.phone);
      console.log(twilio_res);
      return res.send({
        status: "success",
        message: "OTP has been sent to phone. Check your messages and enter the otp",
      });

    } catch (err) {
      next(new AppError(err.message, 500));
    }
  };


exports.verify_otp = async (req, res) => {
    try {
      const { otp, phone } = req.body;

      const otp_res = await twilio_utils.verifySMSOTP(phone, otp);
  
      if (otp_res.status == "approved") {
        
        return res.send({
          status: "success",
          message: `successfully verified`,
        });
      } else {
        return res.status(400).send({
          msg: "OTP incorrect.",
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).send({
        err: err.message,
      });
    }
  };