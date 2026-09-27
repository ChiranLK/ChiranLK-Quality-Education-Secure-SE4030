import bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 12;

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(BCRYPT_COST_FACTOR);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

export const comparePassword = async (password, hashedPassword) => {
  const isMatch = await bcrypt.compare(password, hashedPassword);
  return isMatch;
};
