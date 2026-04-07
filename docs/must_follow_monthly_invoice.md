1. Rent (Tiền thuê nhà – BQL cho thuê trực tiếp)
Fields bắt buộc:

Rent_Contract_ID (string): Mã hợp đồng thuê (unique).
Rental_Period_Start & Rental_Period_End (date): Kỳ thuê.
Base_Rent (decimal): Giá gốc chưa VAT.
VAT_Rate (decimal, default 10% hoặc 8%): Bắt buộc tách thuế.
VAT_Amount (decimal): Tính tự động.
Discount_Amount (decimal): Khuyến mãi (nếu có).
Net_Rent (decimal): Tổng sau VAT + discount.
Payment_Reference (string): Nội dung CK (CANHO_A101_RENT_052026).

Tradeoff: Phải tách VAT vì đây là doanh thu BQL, không phải thu hộ.
Sample:
Rent_Contract_ID: CONT-2026-045 | Period: 01/05/2026-31/05/2026 | Base: 18,000,000 | VAT: 10% (1,800,000) | Discount: 0 | Net: 19,800,000 | Ref: A101_RENT_052026
2. Lease to Own (Thuê mua)
Fields bắt buộc:

LTO_Contract_ID (string).
Installment_No (string, ví dụ: 18/60).
Principal_Payment (decimal): Tiền gốc kỳ này.
Interest_Payment (decimal): Tiền lãi (tính trên dư nợ).
Total_Installment (decimal): Gốc + lãi.
Remaining_Principal (decimal): Dư nợ sau kỳ.
VAT_Rate & VAT_Amount (vì lãi thường chịu VAT).

Tradeoff: Phải lưu Remaining_Principal để cư dân check tiến độ, tránh khiếu nại “sao lãi vẫn cao”.
Sample:
LTO_ID: LTO-2024-112 | Installment: 18/60 | Principal: 22,000,000 | Interest: 3,200,000 | Total: 25,200,000 | Remaining: 1,280,000,000
3. Purchase (Thanh toán tiến độ mua căn hộ)
Fields bắt buộc:

Milestone_Name (string): “Xong móng”, “Cất nóc”, “Bàn giao”.
Payment_Percentage (decimal): % giá trị hợp đồng.
Contract_Value (decimal): Tổng giá trị căn.
Amount_Due (decimal): Tiền phải đóng kỳ này.
Due_Date (date).
VAT_Rate & VAT_Amount.

Tradeoff: Không phải monthly recurring nhưng vẫn cần trong invoice nếu đến hạn tháng đó.
Sample:
Milestone: Cất nóc tầng 35 | %: 10% | Contract: 4,200,000,000 | Due: 420,000,000 | Due_Date: 15/05/2026
4. Utility (Điện/Nước/Gas – tách sub-type)
Fields bắt buộc (dùng chung 1 table, có Utility_Type enum: Electricity/Water/Gas):

Utility_Type (enum).
Meter_ID (string): Số seri đồng hồ.
Previous_Reading & Current_Reading (decimal).
Consumption (decimal): Tự tính.
Usage_Unit (string: kWh/m³).
Price_Tier_Details (JSON): Bậc thang (bắt buộc để minh bạch).
Environment_Fee (decimal): 10% cho nước/gas.
Total_Utility (decimal).
VAT_Rate (thường 0% hoặc 8% tùy loại – thu hộ).

Tradeoff: JSON tier linh hoạt (giá thay đổi theo EVN), nhưng vẫn lưu Consumption riêng để audit.
Sample (Electricity):
Type: Electricity | Meter: E-220501 | Prev: 12450 | Curr: 12890 | Used: 440kWh | Tier: [{"tier":1,"qty":200,"price":1866},{"tier":2,"qty":240,"price":2500}] | Total: 1,050,000 | VAT: 0%
5. Trash (Phí rác)
Fields bắt buộc:

Trash_Type (enum: SinhHoat/CongKenh).
Fixed_Monthly_Fee (decimal).
Unit (string: per_household/per_m2).
VAT_Rate (thường 0% hoặc 10%).

Tradeoff: Đơn giản nhưng phải có type vì rác cồng kềnh tính khác.
Sample:
Type: SinhHoat | Fixed: 45,000 | Unit: per_household
6. Parking (Gửi xe – 1 căn hộ có thể nhiều xe)
Fields bắt buộc:

License_Plate (string): Biển số (unique per month).
Vehicle_Type (enum: XeMay/OTo/XeDien).
Parking_Card_ID (string).
Monthly_Rate (decimal): Tùy loại xe.
VAT_Rate (10%).

Tradeoff: Phải lưu biển số + card để cư dân khiếu nại “xe con tao đâu”.
Sample:
Plate: 51F-123.45 | Type: OTo | Card: PK-2205-001 | Rate: 1,800,000
7. Management Fee (Phí quản lý vận hành – BẮT BUỘC CÓ)
Fields bắt buộc:

Area_Type (enum: ThongThuy/TimTuong).
Area_Size (decimal: m²).
Rate_Per_m2 (decimal).
Included_Services (JSON array): ["An ninh", "Vệ sinh", "Thang máy", "Cây xanh"].
Total_Management (decimal).
VAT_Rate (10% – đây là doanh thu BQL).

Tradeoff: Tính theo m² + dịch vụ kèm theo để cư dân không khiếu nại “sao phí cao”.
Sample:
Area: ThongThuy | Size: 82.5 | Rate: 15,000 | Total: 1,237,500 | VAT: 123,750
8. Sinking Fund (Phí bảo trì 2%)
Fields bắt buộc:

Apartment_Value (decimal): Giá trị căn (trước thuế).
Fund_Rate (decimal: default 2%).
Total_Fund_Due (decimal): Thường đóng 1 lần nhưng app hỗ trợ trả góp.
Paid_To_Date (decimal).
Remaining_Fund (decimal).
Payment_Status (enum: OneTime/Installment).

Tradeoff: Theo luật Nhà ở 2023 là 2% một lần, nhưng nhiều tòa cho trả góp → app phải track.
Sample:
Value: 3,800,000,000 | Rate: 2% | Total_Due: 76,000,000 | Paid: 38,000,000 | Remaining: 38,000,000
9. Other Services (Internet/Cáp/Amenity/EV)
Fields bắt buộc:

Service_Type (enum: Internet/CableTV/Gym/Pool/EV_Charging).
Subscription_ID hoặc Session_ID (cho EV).
Base_Amount (decimal).
Extra_Usage (JSON nếu cần, ví dụ EV kWh).
Total_Service (decimal).
VAT_Rate.

Sample EV:
Type: EV_Charging | kWh: 95 | Rate: 3,500/kWh | Service_Fee: 200,000 | Total: 532,500
10. Penalties & Adjustments (Phần sống còn)
Fields bắt buộc:

Opening_Balance (decimal): Nợ/dư kỳ trước (âm = dư).
Late_Fee (decimal): Phạt chậm (%/ngày).
Adjustment_Amount (decimal): + hoặc -.
Adjustment_Note (text): “Trừ sai chỉ số nước tháng 4”.
Closing_Balance (decimal): Tính tự động.

Tradeoff: Không có field này → cư dân khiếu nại “sao tháng này vẫn đòi nợ cũ”.
Invoice Header chung (khi join tất cả loại trên):

Invoice_ID, Billing_Month (2026-05), Unit_ID, Owner_Name, Tax_Code_BQL, Invoice_Serial_Number (hóa đơn điện tử), Grand_Total, Payment_Deadline, Virtual_Account (số tài khoản ảo riêng căn hộ), QR_String (VietQR), Payment_Reference_Code.

Cái này đủ 100% thực tế để:

Xuất hóa đơn điện tử hợp lệ.
Tách VAT đúng luật (không bị phạt như mấy BQL bị phạt trăm triệu).
Tự reconcile khi cư dân CK.
Cư dân khiếu nại có meter + note rõ ràng.
Hỗ trợ EV, amenity, multi-xe, tiền dư.