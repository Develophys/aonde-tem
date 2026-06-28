import { Injectable } from "@nestjs/common";
import type { EmailService } from "../application/send-magic-code.js";

@Injectable()
export class ConsoleEmailService implements EmailService {
  async sendMagicCode(email: string, code: string): Promise<void> {
    // TODO: swap for Resend (https://resend.com) in production
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: 'noreply@aondetem.com.br', to: email, subject: 'Seu código de acesso', html: `<b>${code}</b>` });
    console.log(`[DEV] Magic code for ${email}: ${code}`);
  }
}
