1. Vấn đề “Tôi đã chuyển khoản” (Cách 1) – Quá rủi ro
Bạn đúng 100%:

Resident có thể quên bấm.
Resident có thể cheat (bấm mà chưa chuyển).
Không thể để hệ thống tự approve chỉ vì resident bấm nút.

Giải pháp mới (khuyến nghị mạnh – an toàn nhất hiện nay ở VN):
Chúng ta giữ nút “Tôi đã chuyển khoản”, nhưng thay đổi hoàn toàn ý nghĩa của nó:



































Trạng thái mớiÝ nghĩaAdmin có phải confirm?Resident có upload biên lai?PENDINGInvoice chưa thanh toán--REPORTED (khi resident bấm)Resident báo đã chuyểnBẮT BUỘCOptional (rất khuyến khích)VERIFIED (admin confirm)Admin đã kiểm tra sao kê → xác nhận nhận tiền--PAIDHoàn tất--
Luồng thực tế sau khi thay đổi:

Resident vào invoice → chọn Chuyển khoản ngân hàng → hiện QR VietQR.
Resident chuyển tiền xong → bấm “Tôi đã chuyển khoản”.
Hệ thống tạo record Payment với status = REPORTED.
Resident có thể upload ảnh biên lai (image upload – dùng MinIO).
Gửi WebSocket notification realtime cho tất cả admin/staff của building.

Admin vào Payments → Pending Verification (tab mới) hoặc ngay trong Invoice Detail:
Thấy list REPORTED + ảnh biên lai (nếu có).
Kiểm tra sao kê ngân hàng (app ngân hàng hoặc internet banking).
Bấm “Xác nhận đã nhận tiền” → status thành VERIFIED → PAID.

Invoice tự động chuyển sang PAID + gửi thông báo cho resident.

Lợi ích:

Không còn cheat (admin vẫn phải verify).
Giảm quên (vì có notification + ảnh biên lai).
Vẫn giữ UX tốt cho resident (không bắt buộc upload, nhưng khuyến khích).
Dễ mở rộng sau này khi có Stripe/VNPay (webhook sẽ tự động VERIFIED).

Tùy chọn cực an toàn (nếu bạn muốn đơn giản hơn):
Bỏ hẳn nút “Tôi đã chuyển khoản”. Resident chỉ thấy QR + text “Vui lòng chuyển khoản và giữ biên lai. Ban quản lý sẽ kiểm tra và cập nhật sau”.
Admin chủ động mark paid khi thấy tiền vào (cách nhiều chung cư nhỏ vẫn đang làm).
Tôi recommend giữ nút + REPORTED status (vì nó tăng tính tương tác và giảm công việc admin một chút).
2. Vấn đề thiết lập thông tin ngân hàng – Owner vs Tenant
Đây là điểm rất hay bạn chỉ ra.
Thực tế ở Việt Nam (rất phổ biến):

Phí quản lý + tiện ích (management fee, điện, nước…) → cư dân (owner hoặc tenant) trả trực tiếp cho Ban Quản Lý (BQL).
Tiền thuê (rent) → tenant trả cho chủ sở hữu (owner).

→ Không thể chỉ có 1 tài khoản ngân hàng cho toàn bộ hệ thống.
Giải pháp kiến trúc (clean & extensible):
Tạo model mới: BankAccount (liên kết linh hoạt)
prismamodel BankAccount {
  id              String   @id @default(cuid())
  bankName        String
  bankCode        String   // ví dụ: vietinbank, bidv...
  accountNumber   String
  accountName     String
  isActive        Boolean  @default(true)
  notes           String?

  // Liên kết
  buildingId      String?  @map("building_id") // BQL dùng cho phí quản lý
  userId          String?  @map("user_id")     // Owner dùng cho tiền thuê

  building        Building? @relation(fields: [buildingId], references: [id])
  owner           User?     @relation(fields: [userId], references: [id])

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([bankCode, accountNumber]) // tránh trùng
}
Logic chọn tài khoản khi generate QR:
Khi tạo invoice hoặc gọi /invoices/{id}/payment-qr:
TypeScript// PaymentGatewayService
async getBankAccountForInvoice(invoice: Invoice) {
  // Ưu tiên 1: Nếu invoice là "rent" → lấy bank của owner
  if (invoice.type === 'RENT' && invoice.contract?.owner?.bankAccounts?.length) {
    return invoice.contract.owner.bankAccounts[0]; // hoặc primary flag
  }

  // Ưu tiên 2: Mặc định là bank của Building (phí quản lý)
  return invoice.building.bankAccounts[0]; // hoặc primary
}

Admin/BQL set bank cho Building (Settings → Payment Config).
Owner (người mua căn hộ) vào profile hoặc trang Owner Dashboard → thêm bank account của mình (dùng cho hợp đồng cho thuê).
Tenant (người thuê) khi thanh toán invoice rent → QR sẽ dùng bank của owner.

Hoàn toàn tự động và đúng với thực tế.
Tóm tắt kiến trúc sau khi fix

BankAccount model (linh hoạt owner/building).
Payment status có thêm REPORTED + VERIFIED.
Resident bấm “Tôi đã chuyển khoản” → chỉ REPORTED + optional upload receipt.
Admin vẫn là người cuối cùng confirm (an toàn tuyệt đối).
VietQR động theo đúng tài khoản ngân hàng của recipient.