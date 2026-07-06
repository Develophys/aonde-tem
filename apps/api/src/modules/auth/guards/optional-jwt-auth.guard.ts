import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { JwtPayload } from "./jwt-auth.guard.js";

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) return true;
    try {
      req.user = this.jwt.verify<JwtPayload>(auth.slice(7));
    } catch {
      // Invalid/expired token on an optionally-authenticated route: proceed
      // anonymously rather than rejecting, since auth isn't required here.
    }
    return true;
  }
}
