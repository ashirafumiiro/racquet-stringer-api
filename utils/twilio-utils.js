const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSID = process.env.TWILIO_VERIFY_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
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

const sendMessage = async (phone, message) =>{
    try {
        if(phone.includes('000000000')) {
            console.log('skipping sms for test number.!')
            return
        };
        const messagingServiceSid = process.env.TWILIO_MESSAGE_SID
        let response = await client.messages
            .create({
                body: message, 
                // from: twilioPhoneNumber, 
                messagingServiceSid,
                to: phone});
    } catch (err) {
        console.log("SMS Error:", err.message)
    } 
}


module.exports = {verifySMSOTP, sendSMSOTP, sendMessage};
