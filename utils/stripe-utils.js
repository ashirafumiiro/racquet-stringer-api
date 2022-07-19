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

exports.create_account = async (name, email, uuid) => {
    const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email,
        business_type: 'company',
        // capabilities: {
        //     card_payments: {requested: true},
        //     transfers: {requested: true},
        // },
        company: {
            name: name
        },
        metadata: {
            uuid: uuid
        }
    });
    return account;
}

exports.create_onboarding_link = async (account_id) =>{
    const accountLink = await stripe.accountLinks.create({
        account: account_id,
        refresh_url: process.env.BASE_URL + '/',
        return_url: process.env.BASE_URL + '/',
        type: 'account_onboarding',
      });
    
    return accountLink;  //use accountLink.url for url;
}

const get_account = async (account_id) =>{
    const account = await stripe.accounts.retrieve(account_id);
    return account;
}

exports.get_account = get_account;

exports.create_checkout_session = async (price_id, destination) => {
    const session = await stripe.checkout.sessions.create({
        line_items: [{
          price: price_id,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: process.env.BASE_URL + '/success',
        cancel_url: process.env.BASE_URL + '/failure',
        payment_intent_data: {
          application_fee_amount: 123,
          transfer_data: {
            destination: destination,
          },
        },
      });

      return session;
}


exports.create_subscription_session = async (stripe_id) => {
    var price_id = process.env.STRIPE_PRICE
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripe_id,
        line_items: [
            {
                price: price_id,
                quantity: 1
            },
        ],
        success_url: process.env.BASE_URL + '/success',
        cancel_url: process.env.BASE_URL + '/failure',
      });

      return session;
};

exports.get_shop_subscriptions = async (stripe_id) => {
    
}