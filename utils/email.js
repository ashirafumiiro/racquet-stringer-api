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
    this.firstName = recipient.full_name;
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

}

module.exports = Email;
