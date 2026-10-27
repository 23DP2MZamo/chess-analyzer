import type { Response } from 'express';
export function setAccessCookie(response: Response, accessToken: string) {
  response.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 1000,
  });
}
