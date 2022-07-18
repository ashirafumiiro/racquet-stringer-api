const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.create_customer = async (name, email, uuid) =>{
    try {
        var customer = await stripe.customers.create({
            name: name,
            email: email,
            metadata: {'uuid': uuid},
            payment_method: 'pm_card_visa',
            invoice_settings: {
                default_payment_method: 'pm_card_visa',

              }
        });
        return customer;
    } catch (err) {
        console.log(err);
    } 
}

exports.update_customer = async (id, obj) =>{
    try {
        var customer = await stripe.customers.update(id, obj);
        return customer;
    } catch (err) {
        console.log(err);
    } 
}

exports.create_session = async (stripe_id) =>{
    const session = await stripe.billingPortal.sessions.create({
        customer: stripe_id,
        return_url: process.env.BASE_URL,
    });

    return session.url;
}