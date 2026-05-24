# Thiết kế UI/UX theo chuẩn MotionSites.ai cho EDU MANAGER V2

**AESTHETIC DIRECTIVE: MOTIONSITES.AI PREMIUM QUALITY**

Bạn là một frontend developer đạt giải thưởng Awwwards. Hãy chuyển đổi giao diện cơ bản này thành một trải nghiệm cực kỳ cao cấp, mượt mà và mang tính tương tác cao cho Dashboard của Hệ thống Quản lý Giáo dục (EDU MANAGER V2).

## Yêu cầu cốt lõi:
- **Motion & Physics:** Sử dụng Framer Motion, GSAP, hoặc CSS transitions cho các hiệu ứng xuất hiện (entrance animations), cuộn trang (scroll-triggered reveals), và các tương tác nhỏ (micro-interactions như nút bấm nam châm, parallax).
- **Depth & Textures:** Sử dụng phong cách thiết kế Glassmorphism (lớp kính mờ qua thuộc tính `backdrop-filter`), đổ bóng mềm nhiều lớp (multi-layered soft shadows), và các dải màu gradient tinh tế (subtle gradients).
- **Typography:** Sử dụng kích thước chữ linh hoạt (fluid typography với `clamp()`), các tiêu đề chính kích thước lớn (oversized hero headings), và sự kết hợp font chữ có độ tương phản cao (ví dụ: Inter kết hợp với Clash Display hoặc Outfit).
- **Theme & Colors:** Giao diện Dark-gradient (ví dụ: nền violet-950, indigo-950) làm chủ đạo cho các thành phần Header/Hero, kết hợp với các thẻ (Cards) nền trắng mờ (white/60 - white/90) mang lại sự sang trọng, hiện đại.
- **Code Quality:** Đảm bảo mã nguồn React được sinh ra đạt chuẩn production-ready, phân chia component rõ ràng, và hoàn toàn thích ứng trên mọi thiết bị (Responsive Mobile-first). KHÔNG sử dụng các placeholder chung chung; hãy dùng dữ liệu mẫu thực tế của hệ thống giáo dục (số lượng học sinh, học phí, lịch học).

## Thành phần cụ thể cần tạo:
1. **Premium Dashboard Hero Section**: Chứa các thẻ chỉ số (Stat Cards) dạng kính mờ, có hiệu ứng hover nổi bật và hiển thị tóm tắt dữ liệu trung tâm.
2. **Interactive Data Table / List**: Danh sách lớp học hoặc giáo viên với hiệu ứng xuất hiện tuần tự (stagger children).
3. **Floating Action Bar**: Thanh công cụ thao tác nổi dạng Glassmorphism.
