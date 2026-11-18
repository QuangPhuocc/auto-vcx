import React, { useState, useMemo, useRef } from 'react';
import {
  Search, RefreshCw, Copy, Check, Upload, Plus, FileText, Download, X,
  Loader2, UserRoundCog, Shield, Building, Briefcase, UserCheck,
  Eye, EyeOff, Edit3, Trash2, AlertCircle, ChevronDown, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { User } from '../types';

interface UsersTabProps {
  currentUser: User;
  token: string | null;
  usersList: User[];
  fetchUsers: () => void;
  triggerNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string, details?: string[]) => void;
}

export function UsersTab({
  currentUser,
  token,
  usersList,
  fetchUsers,
  triggerNotification
}: UsersTabProps) {
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showBatchExcel, setShowBatchExcel] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(() => {
    const parentIds = new Set<string>();
    usersList.forEach((u: any) => {
      if (u.role === 'master' || u.role === 'admin' || u.role === 'client') {
        parentIds.add(u.id);
      }
    });
    return parentIds;
  });

  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Create User Form States
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'client' | 'user'>('admin');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [userCrudError, setUserCrudError] = useState('');

  // Edit User Form States
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Batch Excel Creation States
  const [parsedExcelRows, setParsedExcelRows] = useState<any[]>([]);
  const [batchUploadErrors, setBatchUploadErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Hierarchy Tree
  const userHierarchyTree = useMemo(() => {
    const userMap = new Map<string, { user: User; children: any[] }>();
    const roots: { user: User; children: any[] }[] = [];

    usersList.forEach(u => {
      userMap.set(u.id, { user: u, children: [] });
    });

    usersList.forEach(u => {
      const node = userMap.get(u.id);
      if (!node) return;
      if (u.parentId && userMap.has(u.parentId)) {
        userMap.get(u.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const roleOrder: Record<string, number> = { master: 1, admin: 2, client: 3, user: 4 };
    const sortNodes = (arr: any[]) => {
      arr.sort((a, b) => {
        const diff = (roleOrder[a.user.role] || 99) - (roleOrder[b.user.role] || 99);
        if (diff !== 0) return diff;
        return (a.user.name || '').localeCompare(b.user.name || '');
      });
      arr.forEach(item => sortNodes(item.children));
    };

    sortNodes(roots);
    return roots;
  }, [usersList]);

  const toggleExpandUser = (id: string) => {
    setExpandedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllUsers = () => {
    const all = new Set<string>();
    usersList.forEach(u => all.add(u.id));
    setExpandedUserIds(all);
  };

  const collapseAllUsers = () => {
    const minSet = new Set<string>();
    usersList.forEach(u => {
      if (u.role === 'master' || u.role === 'admin') minSet.add(u.id);
    });
    setExpandedUserIds(minSet);
  };

  const openCreateModal = () => {
    setNewName('');
    setNewPhone('');
    setNewUsername('');
    setNewPassword('');
    const defRole = currentUser?.role === 'master' ? 'admin' : currentUser?.role === 'admin' ? 'client' : 'user';
    setNewRole(defRole);
    setSelectedParentId(currentUser?.role === 'master' ? '' : currentUser?.id || '');
    setShowCreatePassword(false);
    setUserCrudError('');
    setShowCreateUserModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditPhone(u.phone || '');
    setEditPassword('');
    setShowEditPassword(false);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserCrudError('');

    const phone = newPhone.trim();
    if (!phone) {
      setUserCrudError('Vui lòng nhập số điện thoại');
      return;
    }
    if (!/^0\d{9}$/.test(phone)) {
      setUserCrudError('Số điện thoại không hợp lệ (phải gồm đúng 10 chữ số, bắt đầu bằng số 0)');
      return;
    }

    const targetUsername = newUsername.trim() || phone;
    const targetPassword = newPassword.trim() || `${phone}@`;

    fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        username: targetUsername,
        password: targetPassword,
        name: newName.trim(),
        role: newRole,
        phone: phone,
        parentId: selectedParentId || undefined
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cannot create user');
      
      const copyText = `Tài khoản: ${targetUsername} | Mật khẩu: ${targetPassword}`;
      try {
        navigator.clipboard.writeText(copyText);
      } catch (err) {}

      triggerNotification('success', `Đã tạo tài khoản @${targetUsername} (${newRole.toUpperCase()}) và sao chép thông tin vào bộ nhớ tạm!`);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewPhone('');
      setSelectedParentId('');
      setShowCreateUserModal(false);
      fetchUsers();
    })
    .catch(err => {
      setUserCrudError(err.message);
    });
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;

    if (editPhone && editPhone.trim() && (!editPhone.trim().startsWith('0') || editPhone.trim().length < 10)) {
      triggerNotification('error', 'Số điện thoại không hợp lệ (phải gồm đúng 10 chữ số, bắt đầu bằng số 0)');
      return;
    }

    fetch(`/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: editName ? editName.trim() : undefined,
        password: editPassword ? editPassword.trim() : undefined,
        phone: editPhone ? editPhone.trim() : undefined
      })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Update failed');
      }
      triggerNotification('success', `Cập nhật thông tin tài khoản thành công`);
      setEditingUser(null);
      setEditName('');
      setEditPassword('');
      setEditPhone('');
      fetchUsers();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  const handleDeleteUser = (id: string, username: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá tài khoản ${username} và toàn bộ tài khoản cấp dưới trực tiếp?`)) return;

    fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Delete failed');
      }
      triggerNotification('success', `Đã xoá tài khoản ${username}`);
      fetchUsers();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  // Excel Batch Helpers
  const downloadExcelTemplate = () => {
    const headers = [
      ["Tên đăng nhập", "Mật khẩu", "Họ tên", "Số điện thoại", "Vai trò", "Tài khoản trực thuộc"]
    ];
    
    const sampleRows = [
      ["quanly_sample", "123456", "Nguyễn Văn Quản Lý", "0987654321", "Quản lý", "master"],
      ["daily_sample", "123456", "Trần Thị Đại Lý", "0912345678", "Đại lý", "quanly_sample"],
      ["ctv_sample", "123456", "Lê Văn CTV", "0909090909", "CTV", "daily_sample"]
    ];

    const data = [...headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 }
    ];

    ws['!dataValidation'] = [
      {
        sqref: 'E2:E1000',
        type: 'list',
        allowBlank: true,
        showInputMessage: true,
        showErrorMessage: true,
        errorTitle: 'Lỗi chọn vai trò',
        error: 'Vui lòng chọn một vai trò từ danh sách (Quản lý, Đại lý, CTV)',
        promptTitle: 'Chọn vai trò',
        prompt: 'Chọn từ: Quản lý, Đại lý hoặc CTV',
        formula1: '"Quản lý,Đại lý,CTV"'
      }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachTaiKhoanMoi");
    XLSX.writeFile(wb, "VCX_Mau_Tao_Tai_Khoan.xlsx");
    triggerNotification('success', 'Đã tải xuống file Excel mẫu thành công!');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const mockEvent = {
        target: {
          files: [file]
        }
      } as any;
      handleExcelUpload(mockEvent);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } }) => {
    const file = (e.target as any).files?.[0];
    if (!file) return;

    setBatchUploadErrors([]);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        if (rows.length <= 1) {
          triggerNotification('error', 'File Excel trống hoặc không đúng cấu trúc mẫu!');
          return;
        }

        const mapRoleVietnameseToEnglish = (roleStr: string): string => {
          const val = roleStr.toLowerCase().trim();
          if (val === 'quản lý' || val === 'quan ly') return 'admin';
          if (val === 'đại lý' || val === 'dai ly') return 'client';
          if (val === 'ctv') return 'user';
          return roleStr;
        };

        const dataRows = rows.slice(1);
        const parsed = dataRows.map((row) => {
          return {
            username: row[0]?.toString().trim() || '',
            password: row[1]?.toString().trim() || '',
            name: row[2]?.toString().trim() || '',
            phone: row[3]?.toString().trim() || '',
            role: mapRoleVietnameseToEnglish(row[4]?.toString() || ''),
            parentUsername: row[5]?.toString().trim() || ''
          };
        }).filter(r => r.username && r.role);

        if (parsed.length === 0) {
          triggerNotification('error', 'Không tìm thấy dòng tài khoản hợp lệ nào trong file!');
          return;
        }

        setParsedExcelRows(parsed);
        triggerNotification('success', `Đã phân tích thành công ${parsed.length} tài khoản từ Excel. Hãy xác nhận bên dưới!`);
      } catch (err) {
        console.error('Parse Excel failed', err);
        triggerNotification('error', 'Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng!');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmBatchCreate = () => {
    if (parsedExcelRows.length === 0) return;
    setIsUploading(true);
    setBatchUploadErrors([]);

    fetch('/api/users/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ users: parsedExcelRows })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gửi yêu cầu thất bại');
      
      if (data.errors && data.errors.length > 0) {
        setBatchUploadErrors(data.errors);
        triggerNotification('warning', `Đã tạo được ${data.success} tài khoản, có ${data.failed} dòng bị lỗi.`);
      } else {
        triggerNotification('success', `Đã tạo thành công toàn bộ ${data.success} tài khoản từ Excel!`);
        setParsedExcelRows([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      fetchUsers();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    })
    .finally(() => {
      setIsUploading(false);
    });
  };

  const filteredUsers = usersList.filter(u => {
    if (!userSearchTerm.trim()) return true;
    const term = userSearchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      (u.phone && u.phone.includes(term))
    );
  });

  const renderTreeRow = (node: { user: User; children: any[] }, depth: number): React.ReactNode => {
    const u = node.user;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedUserIds.has(u.id);

    const isNodeMaster = u.role === 'master';
    const isNodeAdmin = u.role === 'admin';
    const isNodeClient = u.role === 'client';

    let rowClass = "border-t border-slate-100 transition-colors ";
    let avatarClass = "grid h-8 w-8 place-items-center rounded-full shrink-0 ";
    let branchLine = null;

    if (isNodeMaster) {
      rowClass += "bg-orange-50/40 hover:bg-orange-50/70 border-l-4 border-l-orange-500 font-medium";
      avatarClass += "bg-orange-200 text-orange-800 shadow-2xs";
    } else if (isNodeAdmin) {
      rowClass += "bg-white hover:bg-blue-50/40 border-l-4 border-l-blue-500";
      avatarClass += "bg-blue-100 text-blue-800 shadow-2xs";
      branchLine = <span className="font-mono text-xs font-bold text-blue-500 shrink-0 select-none mr-1">├──</span>;
    } else if (isNodeClient) {
      rowClass += "bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-l-emerald-500";
      avatarClass += "bg-amber-200 text-amber-950 font-bold border border-amber-300 shadow-2xs";
      branchLine = <span className="font-mono text-xs font-bold text-emerald-600 shrink-0 select-none mr-1">├─</span>;
    } else {
      rowClass += "bg-stone-50/40 hover:bg-purple-50/30 border-l-4 border-l-purple-300";
      avatarClass += "bg-purple-100 text-purple-700";
      branchLine = <span className="font-mono text-xs text-purple-400 shrink-0 select-none mr-1">└──</span>;
    }

    const canDelete = 
      (currentUser?.role === 'master' && u.role !== 'master') ||
      (currentUser?.role === 'admin' && u.role === 'client') ||
      (currentUser?.role === 'client' && u.role === 'user');

    return (
      <React.Fragment key={u.id}>
        <tr className={rowClass}>
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
              {branchLine}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpandUser(u.id)}
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 shrink-0 transition-colors"
                  title={isExpanded ? "Thu gọn" : "Mở rộng danh sách cấp dưới"}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : depth === 0 ? null : (
                <span className="w-5 shrink-0" />
              )}
              <div className={avatarClass}>
                <UserRoundCog size={15} />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-xs sm:text-sm">
                  {u.name}
                </div>
                {u.phone && <div className="text-[11px] text-slate-500">{u.phone}</div>}
              </div>
            </div>
          </td>

          <td className="px-3 py-2.5 whitespace-nowrap">
            {u.role === 'master' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                <Shield size={12} /> Master
              </span>
            )}
            {u.role === 'admin' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                <Building size={12} /> Quản lý
              </span>
            )}
            {u.role === 'client' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Briefcase size={12} /> Đại lý
              </span>
            )}
            {u.role === 'user' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                <UserCheck size={12} /> CTV
              </span>
            )}
          </td>

          <td className="px-3 py-2.5 text-center whitespace-nowrap">
            {hasChildren ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-300 text-[11px] text-slate-700 bg-white font-semibold shadow-2xs">
                {node.children.length}
              </span>
            ) : (
              <span className="text-slate-400 text-xs">—</span>
            )}
          </td>

          <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-600 text-xs">
            @{u.username}
          </td>

          {currentUser?.role === 'master' && (
            <td className="px-3 py-2.5 whitespace-nowrap">
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 font-mono font-bold text-slate-700 w-fit text-xs">
                <span className="select-all">{showPasswords[u.id] ? u.password : '••••••••'}</span>
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                  className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                  title={showPasswords[u.id] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPasswords[u.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </td>
          )}

          <td className="px-3 py-2.5 whitespace-nowrap text-right">
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const text = `Tài khoản: ${u.username} | Mật khẩu: ${u.password || ''}`;
                  navigator.clipboard.writeText(text);
                  setCopiedUserId(u.id);
                  setTimeout(() => setCopiedUserId(null), 1500);
                  triggerNotification('success', `Đã sao chép tài khoản @${u.username}`);
                }}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Sao chép thông tin tài khoản"
              >
                {copiedUserId === u.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              </button>
              <button
                onClick={() => openEditModal(u)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Chỉnh sửa thông tin"
              >
                <Edit3 size={15} />
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDeleteUser(u.id, u.username)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xoá tài khoản"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </td>
        </tr>

        {hasChildren && isExpanded && node.children.map((child: any) => renderTreeRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Top Control Bar: Search & Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, username, SĐT…"
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="pl-8 pr-7 w-full h-8 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          {userSearchTerm && (
            <button
              onClick={() => setUserSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap text-xs">
          <button
            type="button"
            onClick={expandAllUsers}
            className="h-8 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            Mở tất cả
          </button>
          <button
            type="button"
            onClick={collapseAllUsers}
            className="h-8 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            Thu gọn
          </button>
          <button
            type="button"
            onClick={fetchUsers}
            className="h-8 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="Làm mới danh sách"
          >
            <RefreshCw size={13} />
          </button>
          {currentUser.role === 'master' && (
            <button
              type="button"
              onClick={() => {
                const text = usersList.map(u => `Tài khoản: @${u.username} | Mật khẩu: ${u.password} | Vai trò: ${u.role.toUpperCase()} | Trực thuộc: ${u.parentUsername ? `@${u.parentUsername}` : 'MASTER'}`).join('\n');
                navigator.clipboard.writeText(text);
                triggerNotification('success', 'Đã sao chép danh sách tài khoản vào bộ nhớ tạm!');
              }}
              className="h-8 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1"
              title="Sao chép toàn bộ danh sách tài khoản"
            >
              <Copy size={13} />
              Xuất danh sách
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowBatchExcel(!showBatchExcel)}
            className={`h-8 px-3 rounded-xl border font-semibold text-xs transition-colors flex items-center gap-1 ${showBatchExcel ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
          >
            <Upload size={13} />
            Nhập Excel
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-8 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 shrink-0"
          >
            <Plus size={14} />
            {currentUser.role === 'master' ? 'Thêm tài khoản' : currentUser.role === 'admin' ? 'Tạo Đại lý' : 'Tạo CTV'}
          </button>
        </div>
      </div>

      {/* Collapsible Excel Batch Upload Section */}
      {showBatchExcel && (
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs md:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={16} className="text-blue-600" />
                Tạo tài khoản hàng loạt bằng Excel
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Tải file mẫu về máy, nhập danh sách tài khoản rồi kéo thả file vào ô bên dưới.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={downloadExcelTemplate}
                type="button"
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-xs border border-blue-200 transition-all flex items-center gap-1.5"
              >
                <Download size={13} />
                Tải file Excel mẫu
              </button>
              <button
                type="button"
                onClick={() => setShowBatchExcel(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-6 px-4 border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 bg-slate-50/50 hover:bg-slate-50 ${isDragActive ? 'border-blue-600 bg-blue-50/30' : 'border-slate-300 hover:border-slate-400'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
                <Upload className="text-slate-400" size={22} />
                <div className="text-xs font-bold text-slate-700 text-center">
                  Kéo thả file Excel vào đây hoặc click để chọn tệp
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase">
                  Hỗ trợ định dạng .xlsx, .xls
                </div>
              </div>
            </div>

            {parsedExcelRows.length > 0 && (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Đã đọc {parsedExcelRows.length} tài khoản</span>
                  <button
                    onClick={handleConfirmBatchCreate}
                    disabled={isUploading}
                    type="button"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={13} /> : <Plus size={13} />}
                    Xác nhận tạo
                  </button>
                </div>

                <div className="max-h-[110px] overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 space-y-1">
                  {parsedExcelRows.slice(0, 10).map((row, index) => (
                    <div key={index} className="text-[10px] font-semibold text-slate-600 flex justify-between border-b border-slate-100 pb-0.5">
                      <span>@{row.username} ({row.name})</span>
                      <span className="text-blue-600 uppercase font-bold">{row.role} → @{row.parentUsername || 'master'}</span>
                    </div>
                  ))}
                  {parsedExcelRows.length > 10 && (
                    <div className="text-[9px] text-slate-400 text-center font-bold italic pt-1">... và {parsedExcelRows.length - 10} tài khoản khác</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {batchUploadErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <h4 className="text-red-800 font-bold text-xs flex items-center gap-1">
                <AlertCircle size={14} />
                Có lỗi xảy ra khi tạo tài khoản hàng loạt:
              </h4>
              <ul className="list-disc pl-4 text-xs font-semibold text-red-700 space-y-0.5 max-h-[100px] overflow-y-auto">
                {batchUploadErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tree Hierarchy Table (Full-width) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3">Họ và tên</th>
                <th className="px-3 py-3">Cấp bậc</th>
                <th className="px-3 py-3 text-center">Cấp dưới</th>
                <th className="px-3 py-3">Tài khoản</th>
                {currentUser.role === 'master' && <th className="px-3 py-3">Mật khẩu</th>}
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {userSearchTerm.trim() ? (
                /* Flat View when searching */
                filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={currentUser.role === 'master' ? 6 : 5} className="p-8 text-center text-xs text-slate-400 font-bold">
                      Không tìm thấy tài khoản nào khớp với từ khóa "{userSearchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const canDelete = 
                      (currentUser?.role === 'master' && u.role !== 'master') ||
                      (currentUser?.role === 'admin' && u.role === 'client') ||
                      (currentUser?.role === 'client' && u.role === 'user');

                    return (
                      <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-700 shrink-0">
                              <UserRoundCog size={15} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-xs sm:text-sm">{u.name}</div>
                              {u.phone && <div className="text-[11px] text-slate-500">{u.phone}</div>}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {u.role === 'master' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                              <Shield size={12} /> Master
                            </span>
                          )}
                          {u.role === 'admin' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <Building size={12} /> Quản lý
                            </span>
                          )}
                          {u.role === 'client' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Briefcase size={12} /> Đại lý
                            </span>
                          )}
                          {u.role === 'user' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                              <UserCheck size={12} /> CTV
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center text-slate-400 text-xs">—</td>

                        <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-600 text-xs">
                          <div>@{u.username}</div>
                          {u.parentUsername && <div className="text-[10px] text-slate-400">Trực thuộc: @{u.parentUsername}</div>}
                        </td>

                        {currentUser.role === 'master' && (
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 font-mono font-bold text-slate-700 w-fit text-xs">
                              <span className="select-all">{showPasswords[u.id] ? u.password : '••••••••'}</span>
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                title={showPasswords[u.id] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                              >
                                {showPasswords[u.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </td>
                        )}

                        <td className="px-3 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const text = `Tài khoản: ${u.username} | Mật khẩu: ${u.password || ''}`;
                                navigator.clipboard.writeText(text);
                                setCopiedUserId(u.id);
                                setTimeout(() => setCopiedUserId(null), 1500);
                                triggerNotification('success', `Đã sao chép tài khoản @${u.username}`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Sao chép thông tin tài khoản"
                            >
                              {copiedUserId === u.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                            </button>
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit3 size={15} />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xoá tài khoản"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              ) : (
                /* Tree Hierarchy View */
                userHierarchyTree.length > 0 ? (
                  userHierarchyTree.map(node => renderTreeRow(node, 0))
                ) : (
                  <tr>
                    <td colSpan={currentUser.role === 'master' ? 6 : 5} className="px-3 py-8 text-center text-slate-400 font-bold">
                      Chưa có tài khoản cấp dưới trực thuộc
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Popup: Create User */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-orange-50/50">
              <div className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <UserRoundCog size={18} className="text-orange-600" />
                {currentUser.role === 'master' ? 'Tạo tài khoản mới' : currentUser.role === 'admin' ? 'Tạo Đại lý' : 'Tạo CTV'}
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              {userCrudError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{userCrudError}</span>
                </div>
              )}
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">1. Họ và tên <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">2. Số điện thoại <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      required
                      autoComplete="off"
                      placeholder="09xxxxxxxx (10 chữ số)"
                      maxLength={10}
                      value={newPhone}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        const prevPhone = newPhone;
                        setNewPhone(val);
                        setUserCrudError('');
                        if (!newUsername || newUsername === prevPhone) {
                          setNewUsername(val);
                        }
                      }}
                      className={`w-full h-9 px-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 text-xs font-semibold transition-colors ${
                        newPhone && (!newPhone.startsWith('0') || newPhone.length < 10)
                          ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                          : newPhone && newPhone.startsWith('0') && newPhone.length === 10
                          ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20'
                          : 'border-slate-300 focus:ring-orange-500'
                      }`}
                    />
                    {newPhone && (!newPhone.startsWith('0') || newPhone.length < 10) && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        {!newPhone.startsWith('0') ? 'Số điện thoại phải bắt đầu bằng số 0' : `Số điện thoại phải đủ 10 chữ số (${newPhone.length}/10)`}
                      </p>
                    )}
                    {newPhone && newPhone.startsWith('0') && newPhone.length === 10 && (
                      <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <Check size={12} /> Số điện thoại hợp lệ
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">3. Tên đăng nhập</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold select-none"
                      placeholder="Mặc định: Số điện thoại"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">4. Mật khẩu (mặc định: sdt@)</label>
                    <div className="relative">
                      <input
                        type={showCreatePassword ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mặc định: sdt@"
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold pr-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                        tabIndex={-1}
                      >
                        {showCreatePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">5. Vai trò <span className="text-rose-500">*</span></label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as any)}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                    >
                      {currentUser.role === 'master' && (
                        <>
                          <option value="admin">Quản lý</option>
                          <option value="client">Đại lý</option>
                          <option value="user">CTV</option>
                        </>
                      )}
                      {currentUser.role === 'admin' && <option value="client">Đại lý</option>}
                      {currentUser.role === 'client' && <option value="user">CTV</option>}
                    </select>
                  </div>

                  {currentUser.role === 'master' && (newRole === 'client' || newRole === 'user') && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">6. Trực thuộc Quản lý / Đại lý:</label>
                      <select
                        value={selectedParentId}
                        onChange={e => setSelectedParentId(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                      >
                        <option value="">Gốc Master (Không trực thuộc ai)</option>
                        {newRole === 'client' && usersList.filter(u => u.role === 'admin').map(u => (
                          <option key={u.id} value={u.id}>[Quản lý] {u.name} (@{u.username})</option>
                        ))}
                        {newRole === 'user' && usersList.filter(u => u.role === 'client' || u.role === 'admin').map(u => (
                          <option key={u.id} value={u.id}>[{u.role === 'admin' ? 'Quản lý' : 'Đại lý'}] {u.name} (@{u.username})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
                  >
                    Tạo tài khoản
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-blue-50/50">
              <div className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <Edit3 size={18} className="text-blue-600" />
                Chỉnh sửa tài khoản: {editingUser.name} (@{editingUser.username})
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">1. Họ và tên <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">2. Số điện thoại</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="09xxxxxxxx"
                      maxLength={10}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">3. Tên đăng nhập</label>
                    <input
                      type="text"
                      value={editingUser.username}
                      readOnly
                      tabIndex={-1}
                      className="w-full h-9 px-3 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold select-none cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">4. Mật khẩu mới</label>
                      {editingUser.password && (
                        <span className="text-[10px] text-emerald-600 font-medium">● Đã lưu</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        value={editPassword}
                        onChange={e => setEditPassword(e.target.value)}
                        placeholder="Để trống nếu không đổi"
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold pr-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                        tabIndex={-1}
                      >
                        {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">5. Vai trò</label>
                    <div className="h-9 px-3 flex items-center rounded-xl border bg-slate-100 text-xs font-bold text-slate-700">
                      {editingUser.role === 'master' && 'Master'}
                      {editingUser.role === 'admin' && 'Quản lý'}
                      {editingUser.role === 'client' && 'Đại lý'}
                      {editingUser.role === 'user' && 'CTV'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
