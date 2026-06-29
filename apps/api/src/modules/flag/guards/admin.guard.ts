import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { JwtPayload } from "../../auth/guards/jwt-auth.guard.js";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) throw new ForbiddenException("Missing token");
    try {
      const payload = this.jwt.verify<JwtPayload>(auth.slice(7));
      if (payload.role !== "admin") throw new ForbiddenException("Admin only");
      req.user = payload;
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new ForbiddenException("Invalid or expired token");
    }
  }
}
