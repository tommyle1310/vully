# 🧪 Testing Guide: Apartment Form UX Improvements

> **Mục tiêu**: Test các tính năng mới trong form chỉnh sửa apartment - policy inheritance, parking management, và các field đã được enable.

---

## 📋 Tổng quan những gì đã thay đổi

### Form Apartment có 3 tab được cập nhật:

| Tab | Thay đổi |
|-----|----------|
| **Occupancy** | Thêm override toggle cho max residents, access cards, pets |
| **Utility** | Thêm "Manage Parking" button, cải thiện labels với tooltips |
| **Billing** | Thêm override toggle cho billing cycle |

---

## 🚀 User Journey 1: Policy Inheritance

### Mục tiêu
Kiểm tra apartment có thể kế thừa hoặc override policy từ building.

### Điều kiện tiên quyết
- ✅ Có ít nhất 1 building với policy đã tạo
- ✅ Building có apartment liên kết

### Các bước test

```
1. Vào trang Apartments (/apartments)
2. Click vào 1 apartment để mở Edit dialog
3. Chọn tab "Occupancy"
```

### 👀 Expect thấy gì

#### A. Field "Max Residents"

```
┌─────────────────────────────────────────────────────────────┐
│  Max Residents              [From policy]     Override [○]  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 4                                                       ││
│  └─────────────────────────────────────────────────────────┘│
│  Using policy value: 4                                      │
└─────────────────────────────────────────────────────────────┘
```

**Giải thích:**
- `[From policy]` = Badge màu xanh lá, cho biết giá trị đang lấy từ building policy
- `Override [○]` = Toggle switch, OFF = dùng policy, ON = tự set giá trị
- Input bị disabled khi toggle OFF

#### B. Khi bật Override toggle

```
1. Click toggle "Override" sang ON
2. Input được enable
3. Badge đổi thành "Overridden" (màu xanh dương)
4. Có thể nhập giá trị mới
5. Save để lưu
```

### ✅ Pass criteria

| # | Test case | Expected |
|---|-----------|----------|
| 1 | Mở apartment form | Thấy badge "From policy" cho các field kế thừa |
| 2 | Toggle Override ON | Input được enable, có thể nhập |
| 3 | Toggle Override OFF | Input disabled, hiện giá trị từ policy |
| 4 | Save với override | Giá trị override được lưu |
| 5 | Save không override | Field override = null trong DB |

---

## 🚀 User Journey 2: Parking Management

### Mục tiêu
Kiểm tra tính năng quản lý parking slots từ apartment form.

### Điều kiện tiên quyết
- ✅ Building có parking zones đã tạo (trong tab Parking của building)
- ✅ Parking zones có slots available

### Các bước test

```
1. Vào trang Apartments (/apartments)
2. Click vào 1 apartment để mở Edit dialog
3. Chọn tab "Utility"
4. Scroll xuống phần "Parking Assignment"
```

### 👀 Expect thấy gì

#### A. Nếu apartment chưa có parking slot

```
┌─────────────────────────────────────────────────────────────┐
│  Parking Assignment                                         │
│                                                             │
│  [ 🚗 Manage Parking ]                                      │
│                                                             │
│  No parking slots assigned                                  │
└─────────────────────────────────────────────────────────────┘
```

#### B. Nếu apartment đã có parking slots

```
┌─────────────────────────────────────────────────────────────┐
│  Parking Assignment                                         │
│                                                             │
│  [ 🚗 Manage Parking ]                                      │
│                                                             │
│  [🚗 A-001] [🚗 A-002] [🏍️ M-015]                           │
│  (badges hiển thị các slot đã assign)                       │
└─────────────────────────────────────────────────────────────┘
```

#### C. Khi click "Manage Parking"

```
┌─────────────────────────────────────────────────────────────┐
│                    Manage Parking                           │
│  Assign or unassign parking slots for this unit             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Assigned Slots (2)                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🚗 A-001  Zone A - Ground Floor   500k/month    [❌]    ││
│  │ 🏍️ M-015  Zone M - Basement       100k/month    [❌]    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Available Zones                                            │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ 🚗 Zone A        │  │ 🏍️ Zone M        │                 │
│  │ Car • 5 of 20    │  │ Motorcycle • 10  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                             │
│  (Click zone để xem slots available)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Pass criteria

| # | Test case | Expected |
|---|-----------|----------|
| 1 | Click "Manage Parking" | Dialog mở ra |
| 2 | Xem assigned slots | Hiển thị list slots đã assign với nút unassign |
| 3 | Click zone card | Expand hiện grid slots available |
| 4 | Click slot để assign | Slot được assign, toast success |
| 5 | Click ❌ để unassign | Confirm dialog, sau đó slot được unassign |
| 6 | Đóng dialog | Badges trong form cập nhật |

---

## 🚀 User Journey 3: Utility Tab Tooltips

### Mục tiêu
Kiểm tra labels và tooltips mới trong tab Utility.

### Các bước test

```
1. Mở apartment form → tab "Utility"
2. Hover vào icon ℹ️ bên cạnh các field
```

### 👀 Expect thấy gì

| Field | Label mới | Tooltip content |
|-------|-----------|-----------------|
| Power Capacity | "Circuit Breaker Rating (A)" | "Maximum amperage of the main circuit breaker" |
| AC Connection Points | "AC Connection Points" | "Number of outdoor AC unit mounting positions" |
| Fire Detector Count | "Fire Detector Count" | "Number of smoke/heat detectors. Per PCCC regulations..." |
| Sprinkler Count | "Sprinkler Count" | "Number of fire suppression sprinkler heads. Per PCCC..." |

### ✅ Pass criteria

| # | Test case | Expected |
|---|-----------|----------|
| 1 | Label đổi tên | "Power Capacity" → "Circuit Breaker Rating (A)" |
| 2 | Hover icon ℹ️ | Tooltip xuất hiện với text giải thích |
| 3 | Section grouping | Có heading "Safety Equipment" và "Infrastructure" |

---

## 🚀 User Journey 4: Billing Tab Override

### Mục tiêu
Kiểm tra override billing cycle từ building policy.

### Các bước test

```
1. Mở apartment form → tab "Billing"
2. Thấy field "Billing Cycle" với badge "From policy"
3. Toggle "Override" ON
4. Chọn billing cycle khác (Monthly/Quarterly/Yearly)
5. Save
```

### 👀 Expect thấy gì

```
┌─────────────────────────────────────────────────────────────┐
│  Billing Cycle              [From policy]     Override [○]  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Monthly                                            ▼    ││
│  └─────────────────────────────────────────────────────────┘│
│  Using policy value: monthly                                │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Pass criteria

| # | Test case | Expected |
|---|-----------|----------|
| 1 | Toggle OFF | Dropdown disabled, hiện policy value |
| 2 | Toggle ON | Dropdown enabled, có thể chọn |
| 3 | Save với override | billingCycle được lưu vào apartment |

---

## 🔧 Components liên quan

```
apps/web/src/
├── app/(dashboard)/apartments/
│   └── apartment-form-dialog.tsx    ← Main form dialog
│
├── components/apartments/
│   ├── parking-assignment-dialog.tsx ← Parking management dialog
│   ├── inherited-field-wrapper.tsx   ← Override toggle + badge
│   └── index.ts                      ← Barrel export
│
├── hooks/
│   ├── use-apartments.ts             ← useApartmentEffectiveConfig, useApartmentParkingSlots
│   └── use-parking.ts                ← useParkingZones, useParkingSlots, useAssign/Unassign
│
└── components/ui/
    └── tooltip.tsx                   ← Shadcn tooltip (mới thêm)
```

---

## 🗄️ API Endpoints được sử dụng

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/apartments/:id/effective-config` | Lấy config với source (building/apartment) |
| GET | `/apartments/:id/parking-slots` | Lấy list parking slots đã assign |
| GET | `/buildings/:id/parking/zones` | Lấy parking zones của building |
| GET | `/buildings/:id/parking/zones/:zoneId/slots` | Lấy slots trong zone |
| POST | `/buildings/:id/parking/zones/:zoneId/slots/:slotId/assign` | Assign slot |
| POST | `/buildings/:id/parking/zones/:zoneId/slots/:slotId/unassign` | Unassign slot |

---

## ⚠️ Known Issues / Limitations

1. **Generate Virtual Bank Account** - Chưa implement (button sẽ disabled)
2. **Parking dialog cần building có zones** - Nếu building chưa setup parking zones, dialog sẽ hiện message "No parking zones configured"

---

## 🚀 User Journey 5: Building Parking Management

### Mục tiêu
Test quản lý parking zones và slots từ trang Building detail.

### Điều kiện tiên quyết
- ✅ Có quyền admin

### Các bước test

```
1. Vào trang Building detail (/buildings/:id)
2. Click tab "Parking"
```

### 👀 Expect thấy gì

#### A. Tạo Zone mới

```
1. Click "Add" button ở phần Parking Zones
2. Điền form: Name, Code, Slot Type, Total Slots, Monthly Fee
3. Click "Create Zone"
→ Zone mới xuất hiện trong list
```

#### B. Edit Zone (MỚI!)

```
1. Hover vào zone card → thấy icon ✏️ (Pencil)
2. Click icon để mở Edit dialog
3. Có thể sửa: Name, Code, Total Slots, Monthly Fee
4. KHÔNG thể sửa: Slot Type (disabled, hiện note giải thích)
5. Click "Update Zone" để lưu
```

| Field | Editable? | Note |
|-------|-----------|------|
| Name | ✅ | |
| Code | ✅ | |
| Slot Type | ❌ | "Slot type cannot be changed after creation" |
| Total Slots | ✅ | Hiện warning nếu giảm dưới số slot đã tạo |
| Monthly Fee | ✅ | |

#### C. Add Slots với validation (MỚI!)

```
1. Chọn zone
2. Click "Add Slots"
3. Dialog hiện:
   - Input số slots muốn thêm
   - Hiện capacity: "Current: 50 / 100 (Remaining capacity: 50)"
   - Nếu nhập số vượt quá → hiện warning đỏ + button disabled
4. Click "Create X Slots"
```

**Validation rules:**
- Không thể tạo slots vượt quá totalSlots của zone
- Button "Create" bị disabled nếu:
  - Số slots < 1
  - Số slots + current > totalSlots

#### D. Assign/Unassign từ slot grid

```
1. Click slot màu xanh lá (available) → mở popover search apartment
2. Search và chọn apartment → slot được assign (đổi màu xanh dương)
3. Click slot màu xanh dương (assigned) → mở confirm dialog
4. Click "Unassign" → slot trở lại available
```

### ✅ Pass criteria

| # | Test case | Expected |
|---|-----------|----------|
| 1 | Hover zone card | Thấy icon edit |
| 2 | Edit zone | Dialog mở với data hiện tại |
| 3 | Save edited zone | Toast success, data cập nhật |
| 4 | Add slots vượt capacity | Warning đỏ, button disabled |
| 5 | Zone hiện tỉ lệ đỏ | Nếu slots > totalSlots, badge chuyển đỏ |

---

## 📝 Checklist nhanh

```
[ ] Mở apartment form, thấy 3 tabs: Occupancy, Utility, Billing
[ ] Tab Occupancy: thấy override toggle cho max residents, access cards, pets
[ ] Tab Utility: thấy "Manage Parking" button
[ ] Tab Utility: hover icon thấy tooltip
[ ] Tab Billing: thấy override toggle cho billing cycle
[ ] Click Manage Parking → dialog mở
[ ] Assign/Unassign parking slot hoạt động
[ ] Save form với override → data đúng trong DB
```

---

*Last updated: April 4, 2026*
