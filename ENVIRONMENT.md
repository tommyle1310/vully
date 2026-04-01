# Environment Variables Documentation

This document describes all environment variables used in the Vully platform.

## Quick Setup

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env  # or use your preferred editor
```

## 📦 Environment Files

### Development
- `.env` - Local development (git-ignored)
- `.env.example` - Template with safe defaults

### Production
- Use environment variables from your hosting platform
- Never commit real secrets to git

## 🔑 Required Variables

### Database

#### `DATABASE_URL`
**Description:** PostgreSQL connection string  
**Format:** `postgresql://[user]:[password]@[host]:[port]/[database]`  
**Example:** `postgresql://vully:secret@localhost:5432/vully_dev`  
**Required:** ✅ Yes  
**Default:** `postgresql://vully:vully_dev_password@localhost:5432/vully_dev`

**Notes:**
- Must use PostgreSQL 15+ for pgvector support
- Ensure `uuid-ossp` and `vector` extensions are available
- For production, use connection pooling (PgBouncer recommended)

#### `POSTGRES_USER`
**Description:** PostgreSQL username (for Docker Compose)  
**Example:** `vully`  
**Required:** ✅ Yes (for Docker)  
**Default:** `vully`

#### `POSTGRES_PASSWORD`
**Description:** PostgreSQL password (for Docker Compose)  
**Example:** `strong_password_here`  
**Required:** ✅ Yes (for Docker)  
**Default:** `vully_dev_password`  
**Security:** ⚠️ Change in production!

#### `POSTGRES_DB`
**Description:** Database name (for Docker Compose)  
**Example:** `vully_production`  
**Required:** ✅ Yes (for Docker)  
**Default:** `vully_dev`

### Redis

#### `REDIS_URL`
**Description:** Redis connection string for BullMQ queues  
**Format:** `redis://[host]:[port]` or `redis://:[password]@[host]:[port]`  
**Example:** `redis://localhost:6379`  
**Required:** ✅ Yes  
**Default:** `redis://localhost:6379`

**Notes:**
- Used for background job queues (invoice generation)
- Supports Redis Cluster for production
- Add password for production: `redis://:password@host:6379`

### JWT Authentication

#### `JWT_ACCESS_SECRET`
**Description:** Secret key for signing access tokens  
**Example:** `aB3xK9mP2vQ8wR5tY7uI1oL4nM6jH0gF`  
**Required:** ✅ Yes  
**Default:** `your-access-secret-change-in-production`  
**Security:** 🔒 **CRITICAL** - Generate with `openssl rand -base64 32`

**Notes:**
- Must be 32+ characters, cryptographically random
- Changing this invalidates all active sessions
- Store securely (use secrets manager in production)

#### `JWT_REFRESH_SECRET`
**Description:** Secret key for signing refresh tokens  
**Example:** `cD4yL8pN3rT9xZ6aV2bI5mK1oJ7nH0gF`  
**Required:** ✅ Yes  
**Default:** `your-refresh-secret-change-in-production`  
**Security:** 🔒 **CRITICAL** - Generate with `openssl rand -base64 32`

**Notes:**
- **MUST** be different from `JWT_ACCESS_SECRET`
- Longer lifetime than access tokens
- Rotate periodically for enhanced security

#### `JWT_ACCESS_EXPIRES_IN`
**Description:** Access token lifetime  
**Format:** Zeit/ms format (e.g., `15m`, `1h`, `7d`)  
**Example:** `15m`  
**Required:** ❌ No  
**Default:** `15m`

**Recommendations:**
- Development: `1h` (convenience)
- Production: `15m` (security)

#### `JWT_REFRESH_EXPIRES_IN`
**Description:** Refresh token lifetime  
**Format:** Zeit/ms format (e.g., `7d`, `30d`)  
**Example:** `7d`  
**Required:** ❌ No  
**Default:** `7d`

**Recommendations:**
- Mobile apps: `30d`
- Web apps: `7d`

### AI Configuration

#### `GEMINI_API_KEY`
**Description:** Google Gemini API key for AI assistant  
**Format:** `AIzaSy...` (39 characters)  
**Example:** `AIzaSyACNnsOJcsem7PJpka7wEwUcrP1LZPsWk0`  
**Required:** ✅ Yes (for AI features)  
**Default:** None

**How to obtain:**
1. Visit [Google AI Studio](https://aistudio.google.com)
2. Sign in with Google account
3. Click "Get API Key"
4. Create new API key or use existing
5. Copy and paste into `.env`

**Notes:**
- Used for chat responses and document embeddings
- Free tier: 60 requests/minute
- Paid tier available for higher limits
- Model used: `gemini-2.0-flash` (768-dim embeddings)

**Cost Estimate (Pay-as-you-go):**
- Chat: ~$0.000125 per 1K characters
- Embedding: ~$0.00002 per 1K characters
- Average chat session: <$0.01

## ⚙️ Optional Variables

### Application

#### `NODE_ENV`
**Description:** Environment mode  
**Values:** `development` | `production` | `test`  
**Example:** `production`  
**Required:** ❌ No  
**Default:** `development`

**Effects:**
- `development`: Detailed errors, hot reload, debug logging
- `production`: Optimized builds, minimal logging, error sanitization
- `test`: Test database, mocked services

#### `API_PORT`
**Description:** Port for NestJS API server  
**Example:** `3001`  
**Required:** ❌ No  
**Default:** `3001`

**Notes:**
- Must not conflict with frontend port (3000)
- Use reverse proxy (Nginx) in production

#### `FRONTEND_URL`
**Description:** Frontend URL for CORS configuration  
**Example:** `https://vully.yourdomain.com`  
**Required:** ❌ No  
**Default:** `http://localhost:3000`

**Notes:**
- Used for CORS whitelist
- Include protocol (`http://` or `https://`)
- No trailing slash

### File Upload & Storage

#### `S3_ENDPOINT`
**Description:** S3-compatible storage endpoint  
**Example:** `https://s3.amazonaws.com`  
**Required:** ❌ No (file uploads disabled if not set)  
**Default:** `http://localhost:9000` (MinIO)

**Supported Services:**
- AWS S3
- Cloudflare R2
- DigitalOcean Spaces
- MinIO (self-hosted)

#### `S3_ACCESS_KEY`
**Description:** S3 access key ID  
**Example:** `AKIAIOSFODNN7EXAMPLE`  
**Required:** ❌ No  
**Default:** `minioadmin`

#### `S3_SECRET_KEY`
**Description:** S3 secret access key  
**Example:** `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`  
**Required:** ❌ No  
**Default:** `minioadmin`  
**Security:** 🔒 Treat as password

#### `S3_BUCKET`
**Description:** S3 bucket name for uploads  
**Example:** `vully-production-uploads`  
**Required:** ❌ No  
**Default:** `vully-uploads`

**Notes:**
- Bucket must exist before upload
- Recommended naming: `{project}-{env}-uploads`

#### `S3_REGION`
**Description:** AWS region for S3 bucket  
**Example:** `ap-southeast-1`  
**Required:** ❌ No  
**Default:** `us-east-1`

**Common Regions:**
- `us-east-1` - US East (N. Virginia)
- `ap-southeast-1` - Singapore
- `eu-west-1` - Ireland

### Security & Validation

#### `CLAMAV_HOST`
**Description:** ClamAV antivirus server host  
**Example:** `clamav.internal`  
**Required:** ❌ No  
**Default:** `localhost`

**Notes:**
- Optional virus scanning for file uploads
- Install ClamAV daemon: `sudo apt install clamav-daemon`
- Docker: `docker run -d -p 3310:3310 clamav/clamav`

#### `CLAMAV_PORT`
**Description:** ClamAV daemon port  
**Example:** `3310`  
**Required:** ❌ No  
**Default:** `3310`

## 🔒 Production Best Practices

### Secrets Management

**❌ Never do this:**
```bash
# Committing secrets to git
DATABASE_URL=postgresql://admin:password123@prod-db/vully
```

**✅ Do this instead:**
```bash
# Use environment variables from CI/CD
# AWS: AWS Secrets Manager
# GCP: Secret Manager
# Azure: Key Vault
# Self-hosted: HashiCorp Vault
```

### Security Checklist

- [ ] All `SECRET` variables are random and unique
- [ ] Passwords use 16+ characters with mixed case, numbers, symbols
- [ ] JWT secrets generated with `openssl rand -base64 32`
- [ ] Database user has minimum required privileges
- [ ] Redis has password authentication enabled
- [ ] S3 bucket has proper ACL (private uploads)
- [ ] HTTPS enabled for all external endpoints
- [ ] CORS restricted to known domains
- [ ] Rate limiting configured for API endpoints

### Rotation Schedule

| Variable | Rotation Frequency |
|----------|-------------------|
| `JWT_ACCESS_SECRET` | Every 90 days |
| `JWT_REFRESH_SECRET` | Every 90 days |
| `DATABASE_PASSWORD` | Every 180 days |
| `S3_SECRET_KEY` | Every 180 days |
| `GEMINI_API_KEY` | As needed (if leaked) |

## 🧪 Testing Environments

### `.env.test`
```bash
NODE_ENV=test
DATABASE_URL=postgresql://vully:test@localhost:5432/vully_test
REDIS_URL=redis://localhost:6380  # Different port
JWT_ACCESS_SECRET=test-access-secret-not-for-production
JWT_REFRESH_SECRET=test-refresh-secret-not-for-production
GEMINI_API_KEY=test-key-mock-responses
```

**Notes:**
- Separate database for tests (auto-reset)
- Mock external services (AI, S3, ClamAV)
- Use fixed secrets for reproducible tests

## 🌍 Multi-Environment Setup

### Local Development
```bash
# .env.local (git-ignored)
NODE_ENV=development
DATABASE_URL=postgresql://vully:dev@localhost:5432/vully_local
GEMINI_API_KEY=your-dev-api-key
```

### Staging
```bash
# Set in CI/CD (e.g., GitHub Secrets)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@staging-db.internal/vully_staging
FRONTEND_URL=https://staging-vully.yourdomain.com
GEMINI_API_KEY=your-staging-api-key
```

### Production
```bash
# Set in hosting platform (Vercel, Railway, AWS, etc.)
NODE_ENV=production
DATABASE_URL=<from-secrets-manager>
REDIS_URL=<from-secrets-manager>
JWT_ACCESS_SECRET=<from-secrets-manager>
JWT_REFRESH_SECRET=<from-secrets-manager>
GEMINI_API_KEY=<from-secrets-manager>
FRONTEND_URL=https://vully.yourdomain.com
```

## 📖 Related Documentation

- [README.md](./README.md) - Setup guide
- [API_GUIDE.md](./API_GUIDE.md) - API documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [.env.example](./.env.example) - Template file

## 🆘 Troubleshooting

### "Database connection failed"
**Cause:** Incorrect `DATABASE_URL`  
**Solution:**
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://vully:password@localhost:5432/vully_dev

# Check for typos in URL
echo $DATABASE_URL
```

### "Redis connection refused"
**Cause:** Redis not running or wrong `REDIS_URL`  
**Solution:**
```bash
# Start Redis
docker-compose up -d redis

# Test connection
redis-cli -u $REDIS_URL ping
# Expected: PONG
```

### "Invalid JWT secret"
**Cause:** `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` too short  
**Solution:**
```bash
# Generate new secrets (32 bytes = 43 chars base64)
openssl rand -base64 32

# Update .env
JWT_ACCESS_SECRET=<generated-value>
JWT_REFRESH_SECRET=<different-generated-value>
```

### "Gemini API key invalid"
**Cause:** Missing or incorrect `GEMINI_API_KEY`  
**Solution:**
1. Verify key at [Google AI Studio](https://aistudio.google.com)
2. Check for extra spaces: `echo "$GEMINI_API_KEY" | wc -c` (should be 40)
3. Regenerate if needed

---

**Last Updated:** Phase 7.2 - April 2026  
**Maintainer:** Vully Development Team
