import { registerAs } from "@nestjs/config";

export default registerAs("refresh-jwt", (): any => {
  const secret = process.env.REFRESH_JWT_SECRET;
  const expiresIn = process.env.REFRESH_JWT_EXPIRES_IN;

  if (!secret) {
    throw new Error("REFRESH_JWT_SECRET is not defined");
  }
  if (!expiresIn) {
    throw new Error("REFRESH_JWT_EXPIRES_IN is not defined");
  }

  return {
    secret,
    expiresIn,
  };
});
