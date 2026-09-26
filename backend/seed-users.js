import dotenv from 'dotenv';
import { logSafeError, logSafeEvent } from './utils/safeLogger.js';
dotenv.config();

const API_URL = 'http://localhost:5000/api';

const testUsers = [
  {
    email: 'student@example.com',
    password: 'password123',
    fullName: 'John Student',
    role: 'user',
    phoneNumber: '1234567890',
    location: 'Colombo, Sri Lanka',
  },
  {
    email: 'tutor@example.com',
    password: 'password123',
    fullName: 'Sarah Tutor',
    role: 'tutor',
    phoneNumber: '0987654321',
    location: 'Colombo, Sri Lanka',
    subjects: ['Mathematics', 'Physics', 'Chemistry'],
  },
  {
    email: 'admin@yahoo.com',
    password: 'Admin123',
    fullName: 'Yahoo Admin',
    role: 'admin',
    phoneNumber: '5555555555',
    location: 'Colombo, Sri Lanka',
  },
  {
    email: 'admin@example.com',
    password: 'password123',
    fullName: 'Admin User',
    role: 'admin',
    phoneNumber: '5555555555',
    location: 'Colombo, Sri Lanka',
  },
];

async function seedUsers() {
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
