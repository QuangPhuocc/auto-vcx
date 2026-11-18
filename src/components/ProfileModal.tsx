import React, { useState } from 'react';
import { Settings, AlertCircle, Loader2, Save } from 'lucide-react';
import type { User } from '../types';

interface ProfileModalProps {
  currentUser: User | null;
  token: string | null;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  triggerNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string, details?: string[]) => void;
}

export function ProfileModal({
  currentUser,
  token,
  onClose,
  onSuccess,
  triggerNotification
}: ProfileModalProps) {
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileUsername, setProfileUsername] = useState(currentUser?.username || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profilePassword, setProfilePassword] = useState(currentUser?.password || '');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileError('');
    setIsUpdatingProfile(true);

    fetch(`/api/users/${currentUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: profileName,
        username: profileUsername,
        phone: profilePhone,
        password: profilePassword || undefined
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại');
      
      const updatedUser: User = {
        ...currentUser,
        name: profileName,
        username: profileUsername,
        phone: profilePhone,
        password: profilePassword || currentUser.password
      };
      
      onSuccess(updatedUser);
      triggerNotification('success', 'Đã cập nhật hồ sơ cá nhân thành công');
      onClose();
    })
    .catch(err => {
      setProfileError(err.message);
    })
    .finally(() => {
      setIsUpdatingProfile(false);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
        >
          Đóng
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
            <Settings size={36} />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Hồ Sơ Cá Nhân</h2>
          <p className="text-xs text-slate-500 font-bold">Cập nhật thông tin tài khoản của bạn</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Họ và tên</label>
            <input 
              type="text" 
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tên đăng nhập</label>
            <input 
              type="text" 
              value={profileUsername}
              onChange={e => setProfileUsername(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Số điện thoại</label>
            <input 
              type="text" 
              value={profilePhone}
              onChange={e => setProfilePhone(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mật khẩu mới</label>
            <input 
              type="password" 
              placeholder="Để trống nếu không muốn đổi..."
              value={profilePassword}
              onChange={e => setProfilePassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
            />
          </div>

          {profileError && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 p-2.5 rounded-xl">
              <AlertCircle size={14} />
              <span>{profileError}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isUpdatingProfile}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2"
          >
            {isUpdatingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Lưu Thay Đổi
          </button>
        </form>
      </div>
    </div>
  );
}
