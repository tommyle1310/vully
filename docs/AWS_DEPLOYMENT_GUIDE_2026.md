# Huong Dan Deploy AWS 2026 (Single Source of Truth)

> Muc tieu: Deploy Vully full AWS (tru Gemini), production-ready cho demo/light use.
> Cap nhat theo thuc te AWS thang 04/2026.
> File nay la tai lieu deployment duy nhat.

---

## 1. Tong Quan (Reality-Checked)

Kien truc khuyen nghi:
- Frontend: AWS Amplify Hosting (Next.js 15, monorepo Turborepo)
- Backend API: NestJS tren Lambda + API Gateway HTTP API
- Database: Aurora PostgreSQL Serverless v2 (pgvector)
- Queue: SQS + Lambda consumer (thay BullMQ)
- File: S3 (presigned URL), CloudFront optional
- DNS/Domain: Route 53
- AI: Gemini (external)

Verdict thuc te (04/2026):
- Co the dat 3-6 USD/thang cho low traffic neu cau hinh Aurora dung (Min ACU = 0 + auto-pause).
- Neu de Min ACU = 0.5 thi DB co the thanh ~20-43 USD/thang (khong con low-cost).
- Day la muc chi phi hop ly de co full AWS native production-grade cho demo/portfolio.

---

## 2. Cost Model Dung (04/2026)

### 2.1 Low traffic (<100 user/ngay, idle nhieu)

| Service | Cost thuc te uoc tinh | Ghi chu |
|---|---:|---|
| Aurora Serverless v2 | **0-4 USD** | Chi gan 0 khi Min ACU=0 + auto-pause + traffic rat thap |
| Lambda + API Gateway | 0-0.5 USD | Free tier bao phu tot |
| S3 + CloudFront | 0-1 USD | Thuong gan 0 voi demo |
| Amplify | 0-1 USD | Tuy build freq + bandwidth |
| Route 53 hosted zone + query | ~0.9 USD | Co ban |
| SQS | ~0 USD | Free tier 1M req/thang |
| **Tong (thuc te)** | **2-7 USD/thang** | **Muc tieu thuc te: 3-6 USD** cho demo/light use |

Domain:
- +12 USD/nam (~1 USD/thang) neu mua .com/.app

### 2.2 Blindspot quan trong nhat (Aurora)

Neu cai nhu sau:
- Min ACU = 0.5
- Chay 24/7

=> tien DB co the o muc ~20-43 USD/thang (tuy region + gia ACU), khong phai 0-2 USD.

Chot:
- Muon low-cost that su: Min ACU = 0 + auto-pause (AWS da ho tro).

---

## 3. Kien Truc Chot Cho Vully

### 3.1 Luong request
1. User vao Amplify app.
2. Frontend goi API Gateway HTTP API.
3. API Gateway invoke Lambda (NestJS).
4. Lambda truy cap Aurora (qua VPC, khuyen nghi qua RDS Proxy sau khi on dinh).
5. Job background day vao SQS.
6. Lambda consumer xu ly message tu SQS.
7. Upload file qua presigned URL len S3 (browser -> S3 truc tiep).

### 3.2 Trade-off can chap nhan
- Socket.IO tat cho phase nay (dung polling/refetch 5-15s).
- Cold start tong hop thuc te: 1.5-4s cho request dau tien sau idle dai (Lambda init + Nest bootstrap + Aurora resume).
- BullMQ -> SQS KHONG phai minimal; thuong 4-8 gio refactor voi module billing co logic trung binh/phuc tap.

---

## 4. Bat Buoc Truoc Khi Deploy

1. IAM user rieng, khong dung root.
2. Region: ap-southeast-1.
3. Budget alert:
   - 5 USD (warning)
   - 15 USD (critical)
4. Tao secrets truoc:
   - JWT_SECRET
   - JWT_ACCESS_SECRET
   - JWT_REFRESH_SECRET
   - DATABASE_URL
   - GEMINI_API_KEY

---

## 5. Step-by-Step AWS Console (Thuc Chien)

### Step 1 - IAM + Account hygiene

1. IAM -> Users -> Create user: `vully-deploy-user`
2. Attach policy tam thoi cho giai doan dau:
   - AmazonS3FullAccess
   - AmazonRDSFullAccess
   - AWSLambda_FullAccess
   - AmazonAPIGatewayAdministrator
   - AWSAmplifyFullAccess
   - AmazonRoute53FullAccess
   - AmazonSQSFullAccess
   - CloudWatchLogsFullAccess
3. Bat MFA cho root + IAM user.
4. Tao Access key cho CLI profile `vully`.

Sau khi deploy on dinh:
- Thu hep policy ve least privilege theo service role.

### Step 2 - Domain + DNS (Route 53)

1. Route 53 -> Register domain (hoac mua ngoai roi tro nameserver ve Route 53).
2. Xac nhan da co Hosted Zone.
3. Chua tao record API/frontend o buoc nay; se map sau.

### Step 3 - Aurora PostgreSQL Serverless v2 (quan trong nhat)

1. RDS -> Create database -> Standard create.
2. Engine: Aurora PostgreSQL compatible.
3. Capacity type: Serverless v2.
4. Cau hinh bat buoc (theo thu tu):
   - Min ACU: **0**
   - Max ACU: **2**
   - Pause compute after: **5 minutes of inactivity** (Enabled)
   - Multi-AZ: **Enabled**
5. DB name: `vully`, user: `vullyadmin`.
6. Giai doan khoi tao co the de Public access = Yes de migrate nhanh.
7. Tao xong thi bat buoc chay:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

8. Sau khi app stable, chuyen sang model an toan:
   - Public access = No
   - Lambda cung VPC/subnet
   - Security group chi allow tu Lambda SG
   - Khuyen nghi bat them RDS Proxy

Luu y chi phi storage:
- Aurora Serverless v2 voi Min ACU=0 van co storage cost (~0.1 USD/GB/thang tuy region).
- Vi du 10GB storage ~1 USD/thang.

Khong lam:
- Khong de `0.0.0.0/0` lau dai.

### Step 4 - S3 (presigned upload)

1. S3 -> Create bucket (private, block public all).
2. Bat versioning.
3. Upload flow:
   - Backend tao presigned URL
   - Frontend upload truc tiep len S3
4. CloudFront optional cho read path (asset public/co signed).

### Step 5 - Backend NestJS tren Lambda

#### 5.1 Khuyen nghi manh (2026 best practice)
- Dung **esbuild** hoac **SWC** de bundle NestJS thanh single file (giam cold start + package size).
- Hoac dung **Lambda Layer** cho AWS SDK + Prisma client.
- Tranh zip `node_modules` nguyen neu co the (de vuot 250MB unzipped limit).

Handler Lambda can dat ro rang:
- `dist/main-lambda.handler`

#### 5.2 Lambda config
- Runtime: Node.js 20.x
- Memory: 512MB (co the test 768MB neu latency cao)
- Timeout: 30s
- Reserved concurrency: de mac dinh luc dau
- Env vars:
  - NODE_ENV=production
  - DATABASE_URL=...
  - FRONTEND_URL=https://your-domain
  - GEMINI_API_KEY=...
  - AWS_S3_BUCKET=...
  - SQS_BILLING_QUEUE_URL=...

#### 5.3 API Gateway
- Dung HTTP API (re hon REST API)
- Route catch-all vao Lambda
- Custom domain: `api.yourdomain`
- ACM cert (DNS validation)

### Step 6 - SQS thay BullMQ (fix DLQ)

1. Queue type: **Standard** (khong dung FIFO tru khi can strict ordering).
2. Tao 2 queue:
   - Main queue: `vully-billing-queue`
   - DLQ: `vully-billing-dlq`
3. Gan redrive policy:
   - maxReceiveCount = 3 (hoac 5)
4. Tao Lambda consumer trigger tu main queue.
5. Trong worker:
   - Parse message an toan
   - Idempotency key cho billing job
   - Log correlation id
   - Throw error de SQS retry dung luong
6. CloudWatch alarm:
   - DLQ ApproximateNumberOfMessagesVisible > 0 -> alert

Refactor effort thuc te:
- Thuong 4-8 gio (khong nen hua minimal).

### Step 7 - Frontend Amplify (Turborepo + pnpm fix)

#### 7.1 Build config
- App root: `apps/web`
- Build command:

```bash
cd ../.. && corepack enable pnpm && pnpm install --frozen-lockfile && pnpm --filter @vully/web build
```

#### 7.2 Bat buoc cho monorepo pnpm
Tao file `.npmrc` o root:

```ini
node-linker=hoisted
shamefully-hoist=true
```

Neu thieu file nay, Amplify co the fail resolve package shared trong monorepo.

Luu y Service Role cua Amplify:
- Neu build fail do permission, kiem tra Amplify service role co quyen deploy/build/doc package artifacts.

#### 7.3 Env var frontend
- NEXT_PUBLIC_API_URL=https://api.yourdomain/api/v1
- NEXT_PUBLIC_S3_BUCKET=your-bucket

### Step 8 - Security hardening sau khi chay duoc

1. DB khong public nua.
2. SG DB chi allow Lambda SG.
3. Can nhac RDS Proxy de on dinh connection burst.
4. Bat WAF cho API Gateway (neu co budget, rat nen bat).
5. Swagger:
   - Tat trong production hoac protect auth.
6. CORS:
   - Chi allow domain frontend that.

---

## 6. Code Impact Checklist (BullMQ -> SQS)

Can lam toi thieu:
- Them `main-sqs-worker.ts`.
- Tach processor khoi runtime API.
- Doi enqueue service tu BullMQ sang AWS SQS SDK.
- Them DLQ + retry observability.
- Update tests:
  - Unit test enqueue/dequeue
  - Integration test retry + DLQ path

Uoc tinh:
- 4-8 gio neu billing logic vua phai.
- 1-2 ngay neu billing phuc tap + can migration test day du.

---

## 7. Performance Reality (Khong Overpromise)

Khi idle lau:
- Lambda cold start + Nest bootstrap + DB resume co the 1.5-4s request dau.

Giai phap practical:
- Warm-up: dung cron-job.org ping `https://api.yourdomain/api/health` moi 10-12 phut trong giai doan demo.
- Toi uu bootstrap Nest (lazy module, bo middleware thua).
- Dung RDS Proxy sau khi traffic bat dau that.

---

## 8. Post-Deploy Verification

```bash
# health
curl https://api.yourdomain/api/health

# readiness
curl https://api.yourdomain/api/health/ready

# frontend
curl -I https://www.yourdomain
```

Test can co:
1. Login flow.
2. CRUD chinh (apartments/contracts/incidents).
3. Upload file presigned S3.
4. Trigger billing job -> vao SQS -> consumer xu ly.
5. Gia lap loi worker -> message vao DLQ -> alarm ban.

---

## 9. Final Recommendation Cho Vully

Nen deploy theo guide nay neu:
- Ban chap nhan refactor BullMQ -> SQS (4-8 gio).
- Ban muon showcase full AWS native.
- Ban chap nhan cold start + polling thay Socket.IO.

Neu muon nhanh + it refactor hon ngay bay gio:
- Co the tam dung Lightsail Nano/Micro (3.5-7 USD) de giu BullMQ + Socket.IO,
- Sau do migrate dan sang serverless.

---

## 10. Environment Variables

### Backend (Lambda)

```env
NODE_ENV=production
FRONTEND_URL=https://www.yourdomain
DATABASE_URL=postgresql://user:pass@host:5432/vully?sslmode=require
JWT_SECRET=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
GEMINI_API_KEY=...
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=...
SQS_BILLING_QUEUE_URL=...
```

### Frontend (Amplify)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain/api/v1
NEXT_PUBLIC_S3_BUCKET=...
```

---

## 11. Troubleshooting Nhanh

### A. Chi phi DB tang bat thuong
- Kiem tra Min ACU co dang = 0.5 hay khong.
- Kiem tra da bat auto-pause chua.

### B. Amplify build loi package shared
- Kiem tra `.npmrc` root co:
  - node-linker=hoisted
  - shamefully-hoist=true
- Kiem tra lai Amplify Service Role permission.

### C. Lambda timeout
- Tang timeout 30 -> 60s tam thoi.
- Kiem tra query cham.
- Kiem tra DB resume delay.

### D. Billing job khong chay
- Kiem tra trigger SQS -> Lambda consumer.
- Kiem tra DLQ co message.
- Kiem tra IAM permission `sqs:ReceiveMessage/DeleteMessage`.

---

## 12. Changelog (04/2026 Reality Fix)

- Fixed cost model Aurora (Min ACU = 0 la dieu kien de scale ve gan 0 chi phi compute khi idle).
- Fixed cost target wording: practical target 3-6 USD/thang, range 2-7 USD/thang.
- Fixed cold-start expectation (1.5-4s request dau co the xay ra).
- Fixed DB security guidance (khong de public + 0.0.0.0/0 trong production).
- Added Lambda packaging guidance (esbuild/SWC/layer) + handler ro rang.
- Added SQS Standard queue + DLQ + alarm requirement.
- Added Amplify monorepo `.npmrc` requirement + service role note.
- Added warm-up step cho giai doan demo.

---

Document version: 2026.04.10
