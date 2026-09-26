import dotenv from 'dotenv';
import { logSafeError, logSafeEvent } from './utils/safeLogger.js';
import { meetsPasswordPolicy } from './utils/passwordPolicy.js';
dotenv.config();

const API_URL = 'http://localhost:5000/api';
const REQUIRED_SEED_CREDENTIALS = [
  'SEED_STUDENT_EMAIL',
  'SEED_STUDENT_PASSWORD',
  'SEED_TUTOR_EMAIL',
  'SEED_TUTOR_PASSWORD',
  'SEED_PRIMARY_ADMIN_EMAIL',
  'SEED_PRIMARY_ADMIN_PASSWORD',
  'SEED_SECONDARY_ADMIN_EMAIL',
  'SEED_SECONDARY_ADMIN_PASSWORD',
];

const testUsers = [
  {
    email: process.env.SEED_STUDENT_EMAIL,
    password: process.env.SEED_STUDENT_PASSWORD,
    fullName: 'John Student',
    role: 'user',
    phoneNumber: '1234567890',
    location: 'Colombo, Sri Lanka',
  },
  {
    email: process.env.SEED_TUTOR_EMAIL,
    password: process.env.SEED_TUTOR_PASSWORD,
    fullName: 'Sarah Tutor',
    role: 'tutor',
    phoneNumber: '0987654321',
    location: 'Colombo, Sri Lanka',
    subjects: ['Mathematics', 'Physics', 'Chemistry'],
  },
  {
    email: process.env.SEED_PRIMARY_ADMIN_EMAIL,
    password: process.env.SEED_PRIMARY_ADMIN_PASSWORD,
    fullName: 'Yahoo Admin',
    role: 'admin',
    phoneNumber: '5555555555',
    location: 'Colombo, Sri Lanka',
  },
  {
    email: process.env.SEED_SECONDARY_ADMIN_EMAIL,
    password: process.env.SEED_SECONDARY_ADMIN_PASSWORD,
    fullName: 'Admin User',
    role: 'admin',
    phoneNumber: '5555555555',
    location: 'Colombo, Sri Lanka',
  },
];

async function seedUsers() {
  const missingCredentialCount = REQUIRED_SEED_CREDENTIALS.filter(
    (name) => typeof process.env[name] !== 'string' || process.env[name].length === 0,
  ).length;

  if (missingCredentialCount > 0) {
    logSafeEvent('user_seed_skipped_missing_credentials', {
      count: missingCredentialCount,
    });
    process.exitCode = 1;
    return;
  }

  const invalidPasswordCount = testUsers.filter(
    (user) => !meetsPasswordPolicy(user.password),
  ).length;

  if (invalidPasswordCount > 0) {
    logSafeEvent('user_seed_skipped_weak_passwords', {
      count: invalidPasswordCount,
    });
    process.exitCode = 1;
    return;
  }

  const result = { created: 0, skipped: 0, failed: 0 };
  logSafeEvent('user_seed_started', { count: testUsers.length });

  for (const user of testUsers) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || response.statusText);
      }

      result.created += 1;
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        result.skipped += 1;
      } else {
        result.failed += 1;
        logSafeError('user_seed_item_failed', error, { statusCode: 500 });
      }
    }
  }

  logSafeEvent('user_seed_completed', {
    count: result.created,
    outcome: result.failed > 0 ? 'partial' : 'success',
  });
}

seedUsers().catch((error) => {
  logSafeError('user_seed_failed', error, { statusCode: 500 });
});
