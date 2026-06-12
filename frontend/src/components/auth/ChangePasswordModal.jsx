import { useState } from 'react';
import Modal from '../ui/Modal';
import { authService } from '../../services/api';
import { useToast } from '../ui/Toast';
import ActionProgressButton from '../ui/ActionProgressButton';

// VI: Modal đổi mật khẩu

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.changePassword(formData.oldPassword, formData.newPassword);
      if (res.success) {
        toast.success('Đổi mật khẩu thành công!');
        onClose();
        setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(res.error?.message || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Không thể kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đổi mật khẩu" busy={loading} busyLabel="Đang đổi mật khẩu...">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu hiện tại
          </label>
          <input
            type="password"
            name="oldPassword"
            value={formData.oldPassword}
            onChange={handleChange}
            className="input"
            required
            autoComplete="current-password"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu mới
          </label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className="input"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-500 mt-1">Tối thiểu 6 ký tự</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Xác nhận mật khẩu mới
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="input"
            required
            autoComplete="new-password"
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60">
            Hủy
          </button>
          <ActionProgressButton type="submit" loading={loading} loadingLabel="Đang xử lý..." className="btn-primary">
            Đổi mật khẩu
          </ActionProgressButton>
        </div>
      </form>
    </Modal>
  );
}
