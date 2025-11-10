import bcrypt from "bcryptjs";

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
export async function comparePassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}
export function isValidSignupCode(code?: string) {
  return !!code && code === process.env.COMPANY_SIGNUP_CODE;
}

