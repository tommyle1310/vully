# accounting-module.md - SPECIFICATION CHI TIẾT MODULE KẾ TOÁN QUẢN LÝ CHUNG CƯ (VULLY MONOREPO)

**Phiên bản:** 1.0 (01/04/2026)  
**Mục tiêu:** Xây dựng module kế toán hoàn chỉnh nằm trong monorepo Vully, hỗ trợ multi-building/portfolio, tuân thủ 100% pháp lý kế toán Việt Nam, tự động sinh Output 1 (sổ sách) & Output 2 (báo cáo) từ input.  
**Phạm vi:** Module nội bộ dành cho Ban quản lý + Kế toán. Không có UI cư dân (chỉ expose REST API cho Vully resident app gọi).  
**Tech stack:** PHẢI GIỐNG HỆT VULLY (xem README.md của monorepo).

## 1. Tổng quan & Kiến trúc
- Module nằm trong thư mục `apps/accounting` hoặc `packages/accounting` của Turborepo.
- Sử dụng **cùng Prisma schema** với Vully (không duplicate table).
- Thêm các model mới nếu cần: ManagementBoard, Investor, JournalEntry, LedgerAccount, ReportCache…
- Mọi table kế toán (Invoice, Payment, Transaction, JournalEntry, Inventory, Payroll, Bill, MaintenanceCost…) **bắt buộc thêm**:
  - `buildingId` (UUID)
  - `managementBoardId` (UUID)
- Tenant isolation: Dùng Prisma middleware + @CurrentUser() + @RolesGuard để scope query tự động theo building/managementBoard.
- RBAC reuse từ Vully:
  - PortfolioAdmin: xem tất cả buildings
  - ManagementBoardAdmin / Accountant: chỉ thấy buildings thuộc board của mình
  - MaintenanceStaff: chỉ thấy phần vật tư/bảo trì
- Double-entry bookkeeping bắt buộc (mọi transaction sinh ra JournalEntry debit/credit theo hệ thống tài khoản VN).

## 2. Models & Database (Prisma)
- Reuse existing: Building, Unit, Resident, Contract, MeterReading, Incident…
- New/Extended models:
  - ManagementBoard (name, ownerInvestorId, contact, address…)
  - Investor (name, taxCode, legalRep, address…)
  - JournalEntry (id, date, description, buildingId, managementBoardId, entries: Json[] {accountCode, debit, credit, description})
  - LedgerAccount (theo TT200/133: 111, 112, 131, 152, 334, 511, 632, 642…)
  - AccountingTransaction (liên kết với Invoice, Payment, Payroll…)
  - InventoryItem, InventoryMovement
  - PayrollRecord, SalarySlip
  - MaintenanceWorkOrder, MaintenanceCost

## 3. Input - Các Form & API Nhập liệu (chi tiết)
Tất cả form/API phải:
- Validation realtime (Zod + React Hook Form)
- Auto-save draft
- AuditLog đầy đủ (reuse AuditLog của Vully)
- Import Excel/CSV + template download
- Export PDF với chữ ký số (pdf-lib + VNPT CA / BKAV CA API)

Các form chính:
- Phiếu thu/chi tiền mặt & chuyển khoản (hạch toán TK 111/112)
- Nhập/xuất vật tư (InventoryMovement → TK 152)
- Nhập hóa đơn điện/nước (từ MeterReading + import CSV EVN/Sapaco)
- Bảng lương & chấm công (tính BHXH, thuế TNCN, tự động sinh PayrollRecord)
- Tạo Bill hàng tháng (tự động tính phí quản lý, điện nước, đỗ xe, phí khác)
- Work order bảo trì + ghi nhận chi phí (liên kết với nhà thầu)
- Ghi nhận công nợ (phải thu/phải trả)

## 4. Tích hợp Bên thứ ba (MVP - Giai đoạn 1)
- E-invoice: Kết nối API VNPT / BKAV / Misa / Fast → tự động tạo & gửi hóa đơn điện tử.
- Import điện nước: API endpoint nhận CSV/Excel → map vào MeterReading.
- Thông báo bill: Sử dụng BullMQ job của Vully (Zalo OA, SMS, Email).
- (Phase 2: Bank webhook auto-reconcile)

## 5. Output 1 - Sổ sách kế toán (tự động sinh 100%)
Trang “Sổ sách kế toán” (internal UI):
- Danh sách đầy đủ theo TT200/2014/TT-BTC & TT133/2016/TT-BTC:
  - Sổ Nhật ký chung
  - Sổ Cái
  - Sổ quỹ tiền mặt (TK 111)
  - Sổ tiền gửi ngân hàng (TK 112)
  - Sổ chi tiết phải thu (TK 131) – theo căn hộ
  - Sổ chi tiết phải trả (TK 331)
  - Sổ chi tiết vật tư (TK 152)
  - Sổ lương & phải trả NLĐ (TK 334)
  - Sổ chi tiết Quỹ vận hành & Quỹ bảo trì (riêng biệt)
- Mỗi sổ: filter theo kỳ, building, account; hiển thị Nợ/Có/Số dư; export PDF/Excel theo mẫu Bộ Tài chính.
- Tất cả sổ sách sinh tự động từ JournalEntry (immutable sau khi post).

## 6. Output 2 - Báo cáo cực kỳ chi tiết
Trang “Báo cáo” với Dashboard + danh sách báo cáo (có filter, chart Recharts, export Excel/PDF):

**Nhóm báo cáo tài chính (VAS):**
- Bảng cân đối kế toán
- Báo cáo kết quả kinh doanh
- Báo cáo lưu chuyển tiền tệ

**Nhóm báo cáo quản trị chung cư:**
- Báo cáo thu-chi Quỹ vận hành (chi tiết khoản mục)
- Báo cáo thu-chi Quỹ bảo trì (tuân thủ Thông tư Bộ Xây dựng, quyết toán 2%)
- Báo cáo công nợ chi tiết + Aging report (theo cư dân/căn hộ)
- Báo cáo bill hàng tháng & tỷ lệ thanh toán
- Báo cáo chi phí bảo trì theo hạng mục
- Báo cáo lương & nhân sự
- Báo cáo điện nước tiêu thụ
- Báo cáo so sánh ngân sách - thực tế
- Báo cáo nợ quá hạn & nhắc nợ

Tất cả báo cáo cache bằng materialized views hoặc ReportCache table để performance < 2s.

## 7. Compliance & Pháp lý (Deep)
- Double-entry 100%.
- Quỹ bảo trì riêng biệt (2% giá trị căn hộ theo luật).
- Export HTKK XML cho cơ quan thuế.
- Chữ ký số điện tử trên mọi chứng từ/báo cáo.
- Audit trail immutable (không cho sửa sau khi post).
- Lưu trữ điện tử 10-15 năm.

## 8. Non-functional Requirements
- Performance: Mọi báo cáo < 2s (caching + index Prisma).
- Security: Reuse AuthGuard + 2FA + HTTPS + row-level security.
- Scalability: Docker + Turborepo ready.
- UI/UX: Next.js 15 App Router + shadcn/ui + Tailwind (giống hệt Vully).
- API: Expose REST endpoints sạch cho Vully resident app (ví dụ: GET /api/accounting/invoices/{id}/payment-qr, GET /api/accounting/invoices/{id}/receipt).

## 9. Acceptance Criteria (Agent phải test trước khi PR)
1. Tạo Portfolio → thêm 2 ManagementBoard → thêm 3 Building → nhập 20 transaction.
2. Kiểm tra Output 1 (sổ sách) & Output 2 (báo cáo) phải khớp 100% với dữ liệu input.
3. Export sổ sách & báo cáo đúng mẫu pháp lý VN + chữ ký số.
4. Accountant của Board A không thấy data Board B.
5. PortfolioAdmin xem được tất cả.
6. API payment-qr & receipt hoạt động (test bằng Postman).

**Module này hoàn thành = Vully có đầy đủ hệ thống kế toán chuyên nghiệp cho chung cư Việt Nam.**

**Kết thúc spec.**