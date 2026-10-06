const MESSAGES = {
  BINDING_OUTSIDE_PAGE: 'Có trường dữ liệu nằm ngoài khổ giấy. Di chuyển khối vào trong trang rồi lưu lại.',
  UNSUPPORTED_BINDING_TRANSFORM: 'Trường dữ liệu cần giữ tỷ lệ chữ và không xoay, lật hoặc nghiêng. Hoàn tác thay đổi rồi lưu lại.',
  UNSUPPORTED_GROUP_STYLE: 'Nhóm chứa dữ liệu động không hỗ trợ độ trong suốt, bóng hoặc clipping. Tách khối để chỉnh phần nền.',
  UNSUPPORTED_BINDING_STYLE: 'Hiệu ứng trên chữ dữ liệu chưa được hỗ trợ khi in. Giữ chữ phẳng, đặt hiệu ứng trên khối nền.',
  INVALID_BINDING_TEXT: 'Mỗi ô chỉ dùng một trường dữ liệu tương ứng. Giữ mã {{field}} và chỉ sửa nội dung trước hoặc sau mã.',
  UNSUPPORTED_BINDING_OBJECT: 'Trường dữ liệu chỉ dùng được trong ô chữ.',
  INVALID_BINDING_GEOMETRY: 'Kích thước trường dữ liệu không hợp lệ. Kiểm tra kích thước khối trước khi lưu.',
  INVALID_OR_OVERSIZED_PRINT_BACKGROUND: 'Ảnh nền bản in vượt giới hạn 8 MB hoặc không hợp lệ. Giảm kích thước ảnh rồi lưu lại.',
  INVALID_PAPER_SIZE: 'Khổ giấy phải nằm trong giới hạn 40 đến 500 mm.',
  INVALID_CANVAS_SIZE: 'Kích thước canvas không hợp lệ. Chọn lại khổ giấy.',
};

export function designerErrorMessage(error) {
  const message = error?.message || 'Không thể cập nhật mẫu. Vui lòng thử lại.';
  return MESSAGES[message.split(':')[0]] || message;
}
