const nodemailer = require('nodemailer');

class Mailer {
    private host: string;

    private port: number;

    private selfAddress: string;

    private emailSuffix: string;

    constructor(host: string, port: number, selfAddress: string, emailSuffix: string) {
        this.host = host;
        this.port = port;
        this.selfAddress = selfAddress;
        this.emailSuffix = emailSuffix;
    };

    public sendMail = (to: string, subject: string, htmlContent: string) => {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: this.host,
            port: this.port
        });

        // setup email data with unicode symbols
        let mailOptions = {
            from: this.selfAddress, // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            html: htmlContent // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message %s sent: %s', info.messageId, info.response);
        });
    }
};

export let mailer = new Mailer('mx1.perkinelmer.com', 25, 'no-reply-jenkins-assistant@perkinelmer.com', 'perkinelmer.com');
