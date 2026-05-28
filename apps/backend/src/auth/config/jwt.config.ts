import { registerAs } from "@nestjs/config";
import { JwtModuleOptions } from "@nestjs/jwt";

export default registerAs("jwt", (): JwtModuleOptions => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  if (!expiresIn) {
    throw new Error("JWT_EXPIRES_IN is not defined");
  }

  return {
    secret,
    signOptions: {
      expiresIn: expiresIn as any,
    }
  };
});
