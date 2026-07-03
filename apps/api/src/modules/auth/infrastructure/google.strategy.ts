import { Injectable, Inject } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type VerifyCallback, type Profile } from "passport-google-oauth20";
import type { User } from "@aonde-tem/domain";
import { LoginWithGoogle } from "../application/login-with-google.js";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(@Inject(LoginWithGoogle) private readonly loginWithGoogle: LoginWithGoogle) {
    super({
      clientID: process.env["GOOGLE_CLIENT_ID"] || "google-oauth-not-configured",
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] || "google-oauth-not-configured",
      callbackURL:
        process.env["GOOGLE_CALLBACK_URL"] ?? "http://localhost:3000/api/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value ?? "";
    const displayName = profile.displayName ?? "";
    const user: User = await this.loginWithGoogle.execute(profile.id, email, displayName);
    done(null, user);
  }
}
