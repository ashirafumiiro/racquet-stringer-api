var Account = require('../models/account');
const jwt = require('jsonwebtoken');
const { promisify } = require("util");
const AppError = require("../utils/AppError");

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
            full_name: req.body.full_name
        }
        const newAdmin = await Account.create(userToAdd);
    
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