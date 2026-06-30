import {
  Controller,
  Post,
  Get,
  Body,
  Inject,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  sendMagicCodeSchema,
  verifyMagicCodeSchema,
  loginSchema,
  completeRegistrationSchema,
  type JwtResponse,
  type RegistrationTokenResponse,
} from "@aonde-tem/contracts";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@aonde-tem/domain";
import { SendMagicCode } from "../application/send-magic-code.js";
import { VerifyMagicCode } from "../application/verify-magic-code.js";
import { LoginWithPassword } from "../application/login-with-password.js";
import { CompleteRegistration } from "../application/complete-registration.js";

function toJwtResponse(user: User, jwt: JwtService): JwtResponse {
  const accessToken = jwt.sign(
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

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(SendMagicCode) private readonly sendCode: SendMagicCode,
    @Inject(VerifyMagicCode) private readonly verifyCode: VerifyMagicCode,
    @Inject(LoginWithPassword) private readonly loginWithPassword: LoginWithPassword,
    @Inject(CompleteRegistration) private readonly completeReg: CompleteRegistration,
    private readonly jwt: JwtService,
  ) {}

  @Post("send-code")
  async sendMagicCode(@Body() body: unknown): Promise<{ message: string }> {
    const dto = sendMagicCodeSchema.parse(body);
    await this.sendCode.execute(dto.email);
    return { message: "Code sent" };
  }

  @Post("verify-code")
  async verifyMagicCode(@Body() body: unknown): Promise<JwtResponse | RegistrationTokenResponse> {
    const dto = verifyMagicCodeSchema.parse(body);
    const user = await this.verifyCode.execute(dto.email, dto.code);

    if (!user.hasPassword()) {
      const registrationToken = this.jwt.sign(
        { sub: user.id, email: user.email.value, type: "registration" },
        { expiresIn: "10m" },
      );
      return { registrationToken, email: user.email.value };
    }

    return toJwtResponse(user, this.jwt);
  }

  @Post("login")
  async login(@Body() body: unknown): Promise<JwtResponse> {
    const dto = loginSchema.parse(body);
    const user = await this.loginWithPassword.execute(dto.email, dto.password);
    return toJwtResponse(user, this.jwt);
  }

  @Post("complete-registration")
  async completeRegistration(@Body() body: unknown): Promise<JwtResponse> {
    const dto = completeRegistrationSchema.parse(body);
    let payload: { sub: string; type: string };
    try {
      payload = this.jwt.verify(dto.registrationToken) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException("Invalid registration token");
    }
    if (payload.type !== "registration") throw new UnauthorizedException("Invalid token type");
    const user = await this.completeReg.execute(payload.sub, dto.displayName, dto.password);
    return toJwtResponse(user, this.jwt);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth(): Promise<void> {
    // Passport redirects to Google — no body needed.
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(
    @Req() req: { user: unknown },
    @Res() res: { redirect: (url: string) => void },
  ): Promise<void> {
    const user = req.user as User;
    const { accessToken } = toJwtResponse(user, this.jwt);
    const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:5173";
    res.redirect(`${frontendUrl}/?token=${accessToken}`);
  }
}
