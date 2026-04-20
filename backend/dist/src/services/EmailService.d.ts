import SMTPTransport from "nodemailer/lib/smtp-transport";
declare class EmailService {
    sendPasswordReset(email: string, resetUrl: string): Promise<SMTPTransport.SentMessageInfo>;
}
declare const _default: EmailService;
export default _default;
