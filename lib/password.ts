import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(`scrypt$${salt}$${derivedKey.toString("hex")}`);
    });
  });
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, salt, hash, ...extra] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash || extra.length > 0 || !/^[\da-f]+$/i.test(hash) || hash.length !== 128) {
    return Promise.resolve(false);
  }

  const expectedKey = Buffer.from(hash, "hex");
  return new Promise((resolve) => {
    scrypt(password, salt, expectedKey.length, (error, derivedKey) => {
      resolve(!error && timingSafeEqual(derivedKey, expectedKey));
    });
  });
}