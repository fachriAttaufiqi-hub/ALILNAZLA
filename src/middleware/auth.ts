import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  // If token is provided, verify it; otherwise use default primary household profile
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
        return next();
      } catch (e) {
        // Fall back gracefully to primary household user
      }
    }
  }

  // Default household user so no login is ever forced!
  req.user = {
    uid: 'keluarga_utama',
    email: 'keluarga@home.local',
    name: 'Keluarga Utama',
    aud: '',
    auth_time: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    firebase: { identities: {}, sign_in_provider: 'anonymous' },
    iss: '',
    sub: 'keluarga_utama',
  };

  // Ensure default user exists in users table
  try {
    await db.insert(users)
      .values({
        uid: 'keluarga_utama',
        email: 'keluarga@home.local',
        displayName: 'Keluarga Utama',
        monthlyBudget: '15000000',
      })
      .onConflictDoNothing();
  } catch (err) {
    // Ignore conflict
  }

  next();
};
