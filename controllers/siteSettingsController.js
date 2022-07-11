var SiteSettings = require('../models/site_settings');
const AppError = require("../utils/AppError");

exports.getSettings = async function (req, res, next) {
    try{
        var setting = await createIfNoExist();
    
        res.status(200).json({
            status: 'Success',
            settings: setting
        });
    }
    catch(err){
        next(new AppError(err.message, 500));
    }
  }

  exports.updateSettings = async (req, res, next) => {
    try{
        const settings = await createIfNoExist();
        
        const updatedSettings = await SiteSettings.findByIdAndUpdate(settings._id, req.body, {
            new: true,
            runValidators: true
            })
            if (!updatedSettings) return next(new AppError("Settings are not stored", 404))
        
            res.status(200).json({
            status: 'Success',
            settings: updatedSettings,
        });
    }
    catch(err){
      next(new AppError(err.message, 500));
    }       
  };

  const createIfNoExist = async function () {
    var setting = await SiteSettings.findOne().exec();
    if(!setting){
        var settingsRecord = await SiteSettings.create({
            maintenanceMode: false,
            stripeDashboardUrl: "http://dashboardUrl",
            googleRecaptchaV3Key: "", 
            ipLimiterLoginNumber: 10, //number of wrong logins possible during  ipLimiterLoginSeconds
            ipLimiterLoginIntervalSeconds: 10, //interval after ipLimiterLoginNumber
            ipLimiterLoginSeconds: 10, //duration for which wrong logins can be retried
            ipLimiterForgotPasswordNumber: 20, //number of password resets possible during  ipLimiterForgotPasswordSeconds)
            ipLimiterForgotPasswordIntervalSeconds: 20, //(interval after ipLimiterForgotPasswordNumber)
            ipLimiterForgotPasswordSeconds: 10 //(duration for which passwords can be reset)
        });
        console.log('Added default settings:', settingsRecord);
    }
    return setting;
  }

  