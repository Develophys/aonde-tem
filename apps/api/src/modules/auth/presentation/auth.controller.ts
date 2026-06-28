import { Controller, Post, Body, Inject } from "@nestjs/common";
import { sendMagicCodeSchema, verifyMagicCodeSchema, type JwtResponse } from "@aonde-tem/contracts";
import { JwtService } from "@nestjs/jwt";
import { SendMagicCode } from "../application/send-magic-code.js";
import { VerifyMagicCode } from "../application/verify-magic-code.js";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(SendMagicCode) private readonly sendCode: SendMagicCode,
    @Inject(VerifyMagicCode) private readonly verifyCode: VerifyMagicCode,
    private readonly jwt: JwtService,
  ) {}

  @Post("send-code")
  async sendMagicCode(@Body() body: unknown): Promise<{ message: string }> {
    const dto = sendMagicCodeSchema.parse(body);
    await this.sendCode.execute(dto.email);
    return { message: "Code sent" };
  }

  @Post("verify-code")
  async verifyMagicCode(@Body() body: unknown): Promise<JwtResponse> {
    const dto = verifyMagicCodeSchema.parse(body);
    const user = await this.verifyCode.execute(dto.email, dto.code);
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email.value, role: user.role },
      { expiresIn: "15m" },
    );
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email.value,
        displayName: user.displayName ?? null,
        role: user.role,
      },
    };
  }
}
