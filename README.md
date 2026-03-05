## AgroVision AI

### Backend Authentication Hardening (March 2026)

Authentication and validation are upgraded to production-style standards.

#### Security Improvements

- Strong request validation using `express-validator` for register/login
- Role-aware required fields for `farmer`, `buyer`, and `expert`
- Login/register endpoint rate limiting (in-memory)
- Account lockout after repeated failed login attempts
- JWT hardening with `issuer`, `audience`, and configurable expiry
- Support for secure HTTP-only auth cookie (`cookie-parser`)
- Auth middleware supports both Bearer token and secure cookie
- Improved CORS controls via environment configuration
- Centralized validation and consistent error response shape

#### Required Backend Environment Variables

Set these in `server/.env`:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `AUTH_COOKIE_NAME`
- `NODE_ENV`
- `CORS_ORIGINS`

#### API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` (protected)

#### Frontend Fixes Included

- Buyer routes corrected in client routing
- Axios now sends credentials (`withCredentials: true`)
- Register sends normalized lowercase role

#### Notes

- Rate limiting is in-memory and suitable for single-instance deployments.
- For distributed production environments, move limiter/lockout storage to Redis.

