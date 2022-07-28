const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSID = process.env.TWILIO_VERIFY_SID
const client = require('twilio')(accountSid, authToken);

const sendSMSOTP = async (phone) =>{
    var response = await client.verify.v2.services(serviceSID)
                        .verifications
                        .create({to: phone, channel: 'sms'});
      return response;
}

const verifySMSOTP = async (phone, code) =>{
    const response = await client.verify.v2.services(serviceSID)
    .verificationChecks
    .create({to: phone, code: code});
    console.log(response.status);
    return response;
}


module.exports = {verifySMSOTP, sendSMSOTP};
