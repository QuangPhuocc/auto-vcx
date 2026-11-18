import React, { useState, useEffect, useMemo } from 'react';
import { FileText, RefreshCw } from 'lucide-react';

export function LogDiffViewer({ oldValue, newValue }: { oldValue?: string; newValue?: string }) {
  if (!oldValue && !newValue) return <p className="text-slate-500 text-xs italic">Không có dữ liệu chi tiết</p>;
  
  let oldJson: any = null;
  let newJson: any = null;
  try { if (oldValue) oldJson = JSON.parse(oldValue); } catch(e) {}
  try { if (newValue) newJson = JSON.parse(newValue); } catch(e) {}

  if (typeof oldJson !== 'object' && typeof newJson !== 'object') {
    return (
      <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
        <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100">
          <span className="block text-[10px] uppercase font-bold text-red-500 mb-1">Giá trị cũ</span>
          <pre className="whitespace-pre-wrap font-mono">{oldValue || '(Trống)'}</pre>
        </div>
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100">
          <span className="block text-[10px] uppercase font-bold text-emerald-500 mb-1">Giá trị mới</span>
          <pre className="whitespace-pre-wrap font-mono">{newValue || '(Trống)'}</pre>
        </div>
      </div>
    );
  }

  if (Array.isArray(oldJson) || Array.isArray(newJson)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto max-h-96">
          <span className="block text-[10px] uppercase font-bold text-red-600 mb-2 border-b pb-1">Dữ liệu gốc (Trước thay đổi)</span>
          <pre className="font-mono text-[11px] whitespace-pre-wrap">{oldValue ? JSON.stringify(oldJson, null, 2) : '(Không có dữ liệu)'}</pre>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto max-h-96">
          <span className="block text-[10px] uppercase font-bold text-emerald-600 mb-2 border-b pb-1">Dữ liệu mới (Sau thay đổi)</span>
          <pre className="font-mono text-[11px] whitespace-pre-wrap">{newValue ? JSON.stringify(newJson, null, 2) : '(Không có dữ liệu)'}</pre>
        </div>
      </div>
    );
  }

  const allKeys = Array.from(new Set([
    ...Object.keys(oldJson || {}),
    ...Object.keys(newJson || {})
  ]));

  const filteredKeys = allKeys.filter(k => k !== 'passwordHash');

  const formatVal = (val: any) => {
    if (val === null || val === undefined) return '(Trống)';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <th className="p-3">Thuộc tính</th>
            <th className="p-3 bg-red-50/50 text-red-700">Giá trị cũ</th>
            <th className="p-3 bg-emerald-50/50 text-emerald-700">Giá trị mới</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-semibold">
          {filteredKeys.map(key => {
            const oldVal = oldJson?.[key];
            const newVal = newJson?.[key];
            const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

            return (
              <tr key={key} className={isChanged ? "bg-amber-50/20" : "text-slate-500"}>
                <td className="p-3 font-mono font-bold text-slate-600">{key}</td>
                <td className={`p-3 font-mono ${isChanged && oldVal !== undefined ? "bg-red-50/30 text-red-600 line-through" : ""}`}>
                  {formatVal(oldVal)}
                </td>
                <td className={`p-3 font-mono ${isChanged && newVal !== undefined ? "bg-emerald-50/30 text-emerald-600 font-bold" : ""}`}>
                  {formatVal(newVal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LogsTab({ token }: { token: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = () => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch(err => console.error('Failed to load logs:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const search = searchTerm.toLowerCase();
      return (
        log.username?.toLowerCase().includes(search) ||
        log.action?.toLowerCase().includes(search) ||
        log.details?.toLowerCase().includes(search)
      );
    });
  }, [logs, searchTerm]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN');
    } catch (e) {
      return isoStr;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'CREATE_USER':
      case 'CREATE_COMPANY':
      case 'CREATE_VEHICLE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE_USER':
      case 'UPDATE_COMPANY':
      case 'UPDATE_VEHICLE':
      case 'UPDATE_COMMISSIONS':
      case 'AI_UPDATE': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE_USER':
      case 'DELETE_COMPANY':
      case 'DELETE_VEHICLE': return 'bg-red-50 text-red-700 border-red-200';
      case 'SYNC_COMMISSIONS':
      case 'SYNC_RATES':
      case 'APPLY_RATES': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FileText size={22} className="text-blue-600" />
          Nhật ký hoạt động hệ thống
        </h2>
        <button 
          onClick={fetchLogs} 
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Tải lại
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm theo người dùng, hành động, mô tả..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">Thời gian</th>
                <th className="p-3">Người dùng</th>
                <th className="p-3">Hành động</th>
                <th className="p-3">Mô tả chi tiết</th>
                <th className="p-3 text-center">Thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Đang tải nhật ký...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Không tìm thấy nhật ký hoạt động nào</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="p-3 font-bold text-slate-800">@{log.username}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs md:max-w-md lg:max-w-lg truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="p-3 text-center">
                      {(log.oldValue || log.newValue) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold transition-all border border-blue-100"
                        >
                          Chi tiết
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[10px] italic">Không có</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Chi tiết thay đổi dữ liệu</h3>
                <p className="text-slate-500 text-xs mt-1 font-bold">
                  Thực hiện bởi <span className="text-slate-700 font-bold">@{selectedLog.username}</span> lúc {formatDate(selectedLog.timestamp)}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Mô tả hành động</span>
                <p className="text-slate-700 text-sm font-bold">{selectedLog.details}</p>
              </div>

              <LogDiffViewer oldValue={selectedLog.oldValue} newValue={selectedLog.newValue} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
