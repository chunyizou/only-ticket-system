// TicketSystem.jsx
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode.react'; // 使用真实的二维码库
import html2canvas from 'html2canvas'; // 用于保存为图片
import { saveAs } from 'file-saver'; // 用于保存文件

/**
 * 票据存储类 - 负责管理电子票数据
 */
class TicketStorage {
  constructor() {
    this.tickets = {};
  }
  
  // 保存票据
  saveTicket(ticket) {
    this.tickets[ticket.id] = ticket;
    this.saveToLocalStorage();
    return true;
  }
  
  // 获取单个票据
  getTicket(id) {
    return this.tickets[id] || null;
  }
  
  // 获取所有票据
  getAllTickets() {
    return Object.values(this.tickets);
  }
  
  // 删除票据
  deleteTicket(id) {
    if (this.tickets[id]) {
      delete this.tickets[id];
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }
  
  // 清空所有票据
  clearAllTickets() {
    this.tickets = {};
    this.saveToLocalStorage();
    return true;
  }
  
  // 将票据保存到 localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('onlyGameTickets', JSON.stringify(this.tickets));
      return true;
    } catch (e) {
      console.error('保存到localStorage失败:', e);
      return false;
    }
  }
  
  // 从 localStorage 加载票据
  loadFromLocalStorage() {
    try {
      const data = localStorage.getItem('onlyGameTickets');
      if (data) {
        this.tickets = JSON.parse(data);
        return true;
      }
      return false;
    } catch (e) {
      console.error('从localStorage加载失败:', e);
      return false;
    }
  }
}

/**
 * 生成唯一ID
 */
const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const randomChars = Array(8)
    .fill(0)
    .map(() => Math.floor(Math.random() * 36).toString(36).toUpperCase())
    .join('');
  
  const checksum = (timestamp.length + randomChars.length) % 10;
  
  return `ONLY-${timestamp.substring(0, 3)}-${randomChars}-${checksum}`;
};

/**
 * 电子票系统组件
 */
function TicketSystem() {
  // 状态管理
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    note: ''
  });
  
  const [tickets, setTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  
  // 引用
  const ticketRef = useRef(null);
  const storageRef = useRef(null);
  
  // 初始化
  useEffect(() => {
    storageRef.current = new TicketStorage();
    storageRef.current.loadFromLocalStorage();
    setTickets(storageRef.current.getAllTickets());
  }, []);
  
  // 处理表单字段变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除相应字段的错误信息
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // 验证表单
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '姓名不能为空';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = '电话号码不能为空';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的手机号码';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 生成电子票
  const generateTicket = () => {
    if (!validateForm()) return;
    
    const ticketId = generateUniqueId();
    
    const newTicket = {
      id: ticketId,
      ...formData,
      createdAt: new Date().toISOString()
    };
    
    // 保存票据并更新状态
    storageRef.current.saveTicket(newTicket);
    
    setTickets(storageRef.current.getAllTickets());
    setCurrentTicket(newTicket);
    setShowPreview(true);
    
    // 重置表单
    setFormData({
      name: '',
      phone: '',
      email: '',
      note: ''
    });
    
    showNotification('电子票生成成功！');
  };
  
  // 删除电子票
  const deleteTicket = (id) => {
    if (window.confirm('确定要删除这张电子票吗？')) {
      const success = storageRef.current.deleteTicket(id);
      
      if (success) {
        // 更新票据列表
        setTickets(storageRef.current.getAllTickets());
        
        // 如果当前正在预览被删除的票，关闭预览
        if (currentTicket && currentTicket.id === id) {
          setShowPreview(false);
          setCurrentTicket(null);
        }
        
        showNotification('电子票已删除');
      } else {
        showNotification('删除失败，请重试');
      }
    }
  };
  
  // 清空所有电子票
  const clearAllTickets = () => {
    if (window.confirm('确定要删除所有电子票吗？此操作不可恢复。')) {
      const success = storageRef.current.clearAllTickets();
      
      if (success) {
        setTickets([]);
        setShowPreview(false);
        setCurrentTicket(null);
        showNotification('所有电子票已删除');
      } else {
        showNotification('操作失败，请重试');
      }
    }
  };
  
  // 保存为图片
  const saveAsImage = () => {
    if (!ticketRef.current) return;
    
    html2canvas(ticketRef.current, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      canvas.toBlob(blob => {
        saveAs(blob, `电子票-${currentTicket.id}.png`);
        showNotification('电子票已保存为图片');
      });
    }).catch(err => {
      console.error('保存图片失败:', err);
      showNotification('保存图片失败，请重试');
    });
  };
  
  // 显示通知
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };
  
  // 关闭预览
  const closePreview = () => {
    setShowPreview(false);
    setCurrentTicket(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">北京独立游戏ONLY1.0</h1>
          <p className="text-gray-600 mt-2">售票系统员工端</p>
        </header>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">创建新电子票</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入姓名"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                电话号码 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入电话号码"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                邮箱
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入邮箱地址"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                备注
              </label>
              <input
                type="text"
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="可选备注信息"
              />
            </div>
          </div>
          
          <button
            onClick={generateTicket}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            生成电子票
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">已生成的电子票</h2>
            
            {tickets.length > 0 && (
              <button
                onClick={clearAllTickets}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                清空所有电子票
              </button>
            )}
          </div>
          
          {tickets.length === 0 ? (
            <p className="text-gray-500 italic">尚未生成任何电子票</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">票号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">电话</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生成时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map(ticket => (
                    <tr key={ticket.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setCurrentTicket(ticket);
                            setShowPreview(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          预览
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTicket(ticket.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* 电子票预览模态框 */}
      {showPreview && currentTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-full overflow-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">电子票预览</h3>
                <button
                  onClick={closePreview}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div ref={ticketRef} className="border border-gray-200 rounded-lg p-6 mb-4 bg-white">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">北京独立游戏ONLY1.0</h4>
                    <p className="text-sm text-gray-600 mt-1">2025年5月10日</p>
                    <p className="text-sm text-gray-600">北京大红门国际会展中心梅花苑3楼</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">电子票ID</p>
                    <QRCode 
                      value={currentTicket.id} 
                      size={120} 
                      level="H" 
                      renderAs="svg"
                      includeMargin={true}
                    />
                    <p className="text-xs mt-1 font-mono">{currentTicket.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">姓名</p>
                    <p className="font-medium">{currentTicket.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">电话</p>
                    <p className="font-medium">{currentTicket.phone}</p>
                  </div>
                  {currentTicket.email && (
                    <div>
                      <p className="text-xs text-gray-500">邮箱</p>
                      <p className="font-medium">{currentTicket.email}</p>
                    </div>
                  )}
                  {currentTicket.note && (
                    <div>
                      <p className="text-xs text-gray-500">备注</p>
                      <p className="font-medium">{currentTicket.note}</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">生成时间</span>
                    <span>{new Date(currentTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={saveAsImage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  保存为图片
                </button>
                <button
                  onClick={closePreview}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 通知提示 */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          {notification}
        </div>
      )}
    </div>
  );
}

// 确保正确导出组件
export default TicketSystem;