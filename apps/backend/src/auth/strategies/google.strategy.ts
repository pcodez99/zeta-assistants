import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-google-oauth20";
import googleAuthConfig from "../config/google-auth.config";
import { ConfigType } from "@nestjs/config";
import { Inject, Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(googleAuthConfig.KEY) 
    private readonly googleConfig: ConfigType<typeof googleAuthConfig>,
    private readonly authService: AuthService
  ) {
    super({
      clientID: googleConfig.clientId || 'mock-id',
      clientSecret: googleConfig.clientSecret || 'mock-secret',
      callbackURL: googleConfig.callbackURL,
      scope: ["email", "profile"],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    const fullName = profile.displayName || 
      [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ").trim() || 
      profile.emails?.[0]?.value?.split("@")[0] || 
      "Google User";
    
    const email = profile.emails[0].value;
    
    const user = await this.authService.validateGoogleUser({
      email,
      name: fullName,
      username: email.split("@")[0],
      image: profile.photos?.[0]?.value || profile._json?.picture,
    });

    done(null, user);
  }
}
