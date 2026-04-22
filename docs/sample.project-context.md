# AI ORCHESTRATION CONTEXT - [Tên Dự Án: Vully]

## 1. System Architecture
- Monorepo: NestJS (Backend) & NextJS 15 (Frontend).
- Communication: REST API, WebSockets (Socket.io), BullMQ for background jobs.
- Database: NeonDB (PostgreSQL) with Drizzle/Prisma.

## 2. Global Context Rules (Token Saving)
- Tránh đọc folder `dist`, `node_modules`, `.next`.
- Khi xử lý logic BE, luôn ưu tiên check `apps/api/src/common/interceptors`.
- Khi xử lý FE, luôn tuân thủ Clean Architecture trong `apps/web/src/features`.

## 3. Module Index
- Billing: Logic tính tiền, tích hợp VietQR. Tọa lạc tại `apps/api/src/modules/billing`.
- Apartment: Quản lý căn hộ, hợp đồng. Tọa lạc tại `apps/api/src/modules/apartments`.

## 4. OpenSpec Contract
Tất cả API Contract được định nghĩa tại `docs/api-contracts.md`. AI phải đọc file này trước khi code tính năng mới liên quan đến kết nối FE-BE.