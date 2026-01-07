# 📖 HƯỚNG DẪN SỬ DỤNG - EDU MANAGER V2

> Phần mềm quản lý trung tâm dạy thêm

---

## 📑 MỤC LỤC

1. [Giới thiệu](#1-giới-thiệu)
2. [Cài đặt](#2-cài-đặt)
3. [Đăng nhập](#3-đăng-nhập)
4. [Dashboard](#4-dashboard)
5. [Quản lý Học viên](#5-quản-lý-học-viên)
6. [Quản lý Lớp học](#6-quản-lý-lớp-học)
7. [Điểm danh](#7-điểm-danh)
8. [Thu học phí](#8-thu-học-phí)
9. [Chi tiêu](#9-chi-tiêu)
10. [Lịch sử giao dịch](#10-lịch-sử-giao-dịch)
11. [Báo cáo](#11-báo-cáo)
12. [Mẫu in](#12-mẫu-in)
13. [Sao lưu & Khôi phục](#13-sao-lưu--khôi-phục)

---

## 1. GIỚI THIỆU

**EDU Manager V2** là phần mềm quản lý trung tâm dạy thêm, giúp:
- Quản lý thông tin học viên, phụ huynh, giáo viên
- Điểm danh và tính học phí tự động
- Thu tiền và in phiếu
- Theo dõi thu/chi tài chính
- Xuất báo cáo

---

## 2. CÀI ĐẶT

### Yêu cầu hệ thống
- Windows 10/11
- Node.js 18+ (đã có sẵn trong thư mục dự án)

### Khởi động
1. Mở thư mục EDU MANAGER V2
2. Double-click vào `start.bat`
3. Đợi trình duyệt tự động mở

---

## 3. ĐĂNG NHẬP

### Tài khoản mặc định
| Vai trò | Username | Password |
|---------|----------|----------|
| Admin | admin | admin123 |
| Lễ tân | receptionist | recept123 |

### Phân quyền
- **Admin**: Toàn quyền (xóa dữ liệu, quản lý mẫu in)
- **Lễ tân**: Xem, thêm, sửa (không xóa)

---

## 4. DASHBOARD

Dashboard hiển thị:
- 📊 **Thống kê**: Số học viên, lớp học, thu/chi tháng
- ⚡ **Hành động nhanh**: Điểm danh, Thu tiền, Thêm học viên
- 📋 **Giao dịch gần đây**: 5 giao dịch mới nhất
- ⚠️ **Học viên chưa đóng tiền**: Danh sách cần nhắc

---

## 5. QUẢN LÝ HỌC VIÊN

### Thêm học viên mới
1. Vào menu **Học viên**
2. Click **+ Thêm học viên**
3. Điền thông tin:
   - Họ tên (bắt buộc)
   - Ngày sinh
   - Giới tính
   - Điện thoại
   - Trường học
4. Chọn phụ huynh (hoặc tạo mới)
5. Click **Lưu**

### Tìm kiếm
- Gõ tên/số điện thoại vào ô tìm kiếm
- Lọc theo lớp: chọn lớp từ dropdown

### Sửa/Xóa
- Click vào dòng học viên để mở chi tiết
- Click ✏️ để sửa, 🗑️ để xóa

---

## 6. QUẢN LÝ LỚP HỌC

### Thêm lớp mới
1. Vào menu **Lớp học**
2. Click **+ Thêm lớp**
3. Điền thông tin:
   - Tên lớp (VD: Toán 9A)
   - Giáo viên phụ trách
   - Học phí/buổi (VND)
   - Ngày học trong tuần
   - Thời gian bắt đầu/kết thúc

### Thêm học viên vào lớp
1. Mở chi tiết lớp
2. Tab **Học viên**
3. Click **+ Thêm học viên**
4. Chọn học viên từ danh sách

---

## 7. ĐIỂM DANH

### Điểm danh hàng ngày
1. Vào menu **Điểm danh**
2. Chọn lớp và ngày
3. Với mỗi học viên, click vào trạng thái:
   - ✅ **Có mặt**: Học viên đã học → tính tiền
   - ⚠️ **Vắng có phép**: Không học → vẫn tính tiền
   - ❌ **Vắng không phép**: Không học → không tính tiền
4. Click **Lưu điểm danh**

### Lưu ý
- Chỉ điểm danh được các ngày trong lịch học của lớp
- Có thể sửa điểm danh trong vòng 7 ngày

---

## 8. THU HỌC PHÍ

### Tạo phiếu thu
1. Vào menu **Thu tiền**
2. Chọn học viên
3. Chọn tháng cần thu
4. Hệ thống tự động tính:
   - Số buổi học
   - Học phí/buổi
   - Tổng tiền
5. Chọn phương thức: Tiền mặt / Chuyển khoản
6. Click **Tạo phiếu thu**

### In phiếu
- Click 🖨️ để xem và in PDF

---

## 9. CHI TIÊU

### Tạo phiếu chi
1. Vào menu **Chi tiêu**
2. Chọn danh mục:
   - 💰 Lương giáo viên
   - 💡 Điện nước
   - 📎 Văn phòng phẩm
   - 📦 Chi phí khác
3. Nhập số tiền
4. Nhập tên người nhận
5. Click **Tạo phiếu chi**

### Trả lương nhanh
- Chọn danh mục **Lương giáo viên**
- Click tên giáo viên từ danh sách nhanh

---

## 10. LỊCH SỬ GIAO DỊCH

### Xem lịch sử
1. Vào menu **Lịch sử**
2. Xem tất cả giao dịch thu/chi

### Lọc
- **Loại**: Tất cả / Chỉ Thu / Chỉ Chi
- **Thời gian**: Chọn từ ngày - đến ngày

### Xuất Excel
- Click **📄 Xuất Excel** để tải file

### In lại phiếu
- Click 🖨️ trên dòng giao dịch

---

## 11. BÁO CÁO

### Báo cáo tài chính
1. Vào menu **Báo cáo**
2. Chọn loại: Ngày / Tuần / Tháng / Năm
3. Chọn khoảng thời gian
4. Xem:
   - Tổng thu/chi
   - Biểu đồ theo danh mục chi
   - Chi tiết từng khoản

---

## 12. MẪU IN

### Quản lý mẫu
1. Vào menu **Mẫu in**
2. Xem danh sách mẫu phiếu thu/chi

### Tạo mẫu mới
1. Click **+ Tạo mẫu mới**
2. Nhập tên mẫu
3. Chọn loại: Phiếu thu / Phiếu chi
4. Chọn khổ giấy: A4, A5, Letter, Thermal 80mm
5. Click **Tạo mẫu**

### Thiết kế mẫu
1. Click **🎨 Thiết kế** trên mẫu
2. Kéo thả các phần tử:
   - Text tĩnh (tiêu đề, nội dung)
   - Trường dữ liệu (mã phiếu, tên học viên...)
3. Chỉnh sửa:
   - Vị trí, kích thước
   - Font chữ, màu sắc
4. Click **💾 Lưu mẫu**

### Đặt mẫu mặc định
- Click **⭐** trên mẫu cần đặt mặc định

---

## 13. SAO LƯU & KHÔI PHỤC

### Sao lưu
1. Double-click `backup.bat`
2. Backup được lưu tại thư mục `backups/`

### Khôi phục
1. Double-click `restore.bat`
2. Nhập tên thư mục backup
3. Xác nhận khôi phục

### Khuyến nghị
- Sao lưu hàng ngày
- Sao lưu trước khi cập nhật phần mềm

---

## ❓ HỖ TRỢ

Nếu gặp vấn đề:
1. Khởi động lại phần mềm: `stop.bat` rồi `start.bat`
2. Kiểm tra kết nối mạng
3. Liên hệ hỗ trợ kỹ thuật

---

*Phiên bản: 2.0*
*Cập nhật: 2026-01-07*
