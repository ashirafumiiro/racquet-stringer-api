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
        capabilities: {
            card_payments: {requested: true},
            transfers: {requested: true},
        },
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

exports.create_checkout_session = async (price, stripe_account, comission, metadata) => {
    const orderId = metadata.order_id;
    const email = metadata.client_email;
    const session = await stripe.checkout.sessions.create({
        customer_email: email,
        line_items: [{
            price_data: {
                currency: 'USD',
                product_data: {
                    name: 'Order Cost', 
                    description: 'Total amount of the operation'
                },
                unit_amount: price
            },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: metadata,
        success_url: process.env.BASE_URL + `/order/${orderId}?status=success`,
        cancel_url: process.env.BASE_URL + `/order/${orderId}?status=fail`,
        payment_intent_data: {
          application_fee_amount: comission,
        }
      },{
        stripeAccount: stripe_account,
    });

      return session;
}


exports.create_subscription_session = async (stripe_id, price_id) => {
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripe_id,
        line_items: [
            {
                price: price_id,
                quantity: 1
            },
        ],
        success_url: process.env.BASE_URL + '/inventory?active=payment&status=sucess',
        cancel_url: process.env.BASE_URL + '/failure',
      });

      return session;
};

exports.get_shop_subscriptions = async (stripe_id) => {
    
}

exports.accout_charges_enabled = async (stripe_account_id) =>{
    try {
        const account = await get_account(stripe_account_id);
        if(account.charges_enabled)
            return true;
    } catch (err) {
        throw err;
    }
    return false;
}