const nodemailer = require("nodemailer");
const pug = require("pug");
const { convert } = require("html-to-text");
const AppError = require("./AppError");
class Email {
  constructor(recipient, subject, text_message) {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      // secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      }
    });
    const from_email = process.env.EMAIL_USER;
    // this.firstName = recipient.full_name;
    this.from = from_email;
    this.to = recipient.email;
    this.subject = subject;
    this.text = text_message;
  }
  async send(html, subject) {
    //render html based on pug template

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text: convert(html),
      html,
    };
    try {
        let response = await this.transporter.sendMail(mailOptions);
    } catch (err) {
      console.log("error sending email", err);
      new AppError("failed to send email", 403);
    }
  }
  async sendEmail() {
    try {
      let response = await this.transporter.sendMail(this.mailOptions);
      console.log('mail res:', response);
    } catch (err) {
      console.log("error sending email", err);
      new AppError("failed to send email", 403);
    }
  }
  async sendWelcome() {
    console.log("reached jere");
    const html = pug.renderFile(`${__dirname}/../views/email/welcome.pug`, {
      firstName: this.firstName,
      subject: this.subject,
      message: this.text
    });
    await this.send(html, "Welcome to Gpa Elevator");
  }
  async sendPasswordReset(url) {
    const html = pug.renderFile(
      `${__dirname}/../views/email/passwordReset.pug`,
      {
        firstName: this.firstName,
        subject: this.subject,
        url,
      }
    );
    await this.send(html, "Reset Password");
  }
  async sendNotification(object, objName) {
    const html = pug.renderFile(
      `${__dirname}/../views/email/notification.pug`,
      {
        object,
        objName,
      }
    );
    await this.send(html, "Notification");
  }
  async sendVerifyAccount(url) {
    const html = pug.renderFile(
      `${__dirname}/../views/email/verifyAccount.pug`,
      {
        firstName: this.firstName,
        subject: this.subject,
        url,
      }
    );
    await this.send(html, "Verify Account");
  }

  async shopOrderConfirm(order) {
    const {order_number, amount, due_on, racquet, delivery_address} = order;
    const customer_name = `${delivery_address.first_name} ${delivery_address.last_name}`;
    const customer_phone = delivery_address.phone_number
    let is_hybrid = racquet.mains.string_id.id === racquet.crosses.string_id.id
    console.log('Sending email for order: #' + order_number)
    
    const html = pug.renderFile(
      `${__dirname}/../views/email/shop_order_confirm.pug`,
      {
        order_number,
        amount,
        customer_name, 
        is_hybrid,
        customer_phone,
        crosses: racquet.crosses,
        mains: racquet.mains,
        due_on: due_on.toLocaleDateString("en-US"),
        brand: racquet.brand,
        model: racquet.model
      }
    );
    await this.send(html, "You received an order through RacquetPass!");
    console.log('Sent successfully')
  }

  async shopOrderPayment(order) {
    const {order_number} = order;
    const html = pug.renderFile(
      `${__dirname}/../views/email/shop_payment_confirm.pug`,
      {
        order_number,
        full_name
      }
    );
    await this.send(html, "Confirmation of order payment");
  }

  async custormerOrderConfirm(shop_name, order_number) {
    const html = pug.renderFile(
      `${__dirname}/../views/email/customer_order_confirm.pug`,
      {
       shop_name, order_number
      }
    );
    await this.send(html, "Order Submited");
  }

  async custormerOrderPyament(shop_name, order_number) {
    const html = pug.renderFile(
      `${__dirname}/../views/email/customer_payment_confirm.pug`,
      {
       shop_name, order_number
      }
    );
    await this.send(html, "Payment Received");
  }
}

module.exports = Email;
