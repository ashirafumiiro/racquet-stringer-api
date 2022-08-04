const SurveySchema = require('../models/survey');
const { body, validationResult } = require('express-validator');
const AppError = require("../utils/AppError");

exports.create_survey = [
    // Validate and sanitize fields.
    body('game', 'game must not be empty.').trim().isLength({ min: 1 }).escape(),

    // Process request after validation and sanitization.
    async (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Raquet object with escaped and trimmed data.

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.
            var firstError = (errors.array())[0]
            return next(new AppError(firstError.msg, 400));
        }
        else {
            try {
                // validate created by exist
                const newSurvey = await SurveySchema.create({ ...req.body, created: Date.now() });

                res.status(200).json({
                    status: 'Success',
                    survey: newSurvey,
                });
            } catch (err) {
                next(new AppError(err.message, 500));
            }
        }
    }
];