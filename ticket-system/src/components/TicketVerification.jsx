// TicketVerification.jsx
import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library'; // 用于扫描二维码

/**
 * 票据验证组件 - 用于现场扫码入场
 */
function TicketVerification() {
  // 状态管理
  const [scanning, setScanning] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifiedTickets, setVerifiedTickets] = useState([]);
  const [notification, setNotification] = useState(null);
  const [manualTicketId, setManualTicketId] = useState('');
  const [stats, setStats] = useState({
    verified: 0,
    total: 0,
    attendance: 0
  });
  
  // 引用
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const storageRef = useRef(null);
  
  // 初始化
  useEffect(() => {
    // 加载已验证的票据记录
    const loadVerifiedTickets = () => {
      try {
        const data = localStorage.getItem('onlyGameVerifiedTickets');
        if (data) {
          return JSON.parse(data);
        }
        return {};
      } catch (e) {
        console.error('从localStorage加载已验证票据失败:', e);
        return {};
      }
    };
    
    // 加载所有票据
    const loadAllTickets = () => {
      try {
        const data = localStorage.getItem('onlyGameTickets');
        if (data) {
          return JSON.parse(data);
        }
        return {};
      } catch (e) {
        console.error('从localStorage加载票据失败:', e);
        return {};
      }
    };
    
    // 设置验证记录和统计数据
    const verified = loadVerifiedTickets();
    const tickets = loadAllTickets();
    
    storageRef.current = {
      verifiedTickets: verified,
      allTickets: tickets
    };
    
    setVerifiedTickets(Object.keys(verified));
    
    // 更新统计信息
    setStats({
      verified: Object.keys(verified).length,
      total: Object.keys(tickets).length,
      attendance: Object.keys(verified).length
    });
    
    // 组件卸载时清理
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);
  
  // 启动扫码
  const startScanning = async () => {
    try {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }
      
      setScanning(true);
      
      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        showNotification('未检测到摄像头设备', 'error');
        setScanning(false);
        return;
      }
      
      // 使用后置摄像头（如果有多个摄像头）
      const selectedDeviceId = videoInputDevices.length > 1 
        ? videoInputDevices[1].deviceId 
        : videoInputDevices[0].deviceId;
      
      codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            // 处理扫描结果
            handleScanResult(result.getText());
          }
          if (err && !(err instanceof TypeError)) {
            console.error('扫描错误:', err);
          }
        }
      );
    } catch (error) {
      console.error('启动扫码失败:', error);
      showNotification('启动扫码失败，请检查摄像头权限', 'error');
      setScanning(false);
    }
  };
  
  // 停止扫码
  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setScanning(false);
  };
  
  // 处理扫描结果
  const handleScanResult = (ticketId) => {
    stopScanning();
    verifyTicket(ticketId);
  };
  
  // 手动输入票号并验证
  const handleManualEntry = (e) => {
    e.preventDefault();
    if (manualTicketId.trim()) {
      verifyTicket(manualTicketId.trim());
      setManualTicketId('');
    }
  };
  
  // 验证票据
  const verifyTicket = (ticketId) => {
    // 检查是否存在该票据
    const ticket = storageRef.current.allTickets[ticketId];
    
    if (!ticket) {
      setVerificationResult({
        success: false,
        message: '无效票据：票据不存在',
        ticketId
      });
      
      showNotification('无效票据', 'error');
      return;
    }
    
    // 检查是否已验证
    const isVerified = ticketId in storageRef.current.verifiedTickets;
    
    if (isVerified) {
      const verifiedTime = new Date(storageRef.current.verifiedTickets[ticketId].verifiedAt);
      
      setVerificationResult({
        success: false,
        message: `票据已使用：${verifiedTime.toLocaleString()}`,
        ticket,
        verifiedTime
      });
      
      showNotification('票据已使用', 'warning');
      return;
    }
    
    // 验证票据
    const verificationTime = new Date();
    
    // 更新验证记录
    storageRef.current.verifiedTickets[ticketId] = {
      verifiedAt: verificationTime.toISOString(),
      ticket
    };
    
    // 保存到localStorage
    try {
      localStorage.setItem('onlyGameVerifiedTickets', JSON.stringify(storageRef.current.verifiedTickets));
      
      // 更新状态
      setVerifiedTickets([...Object.keys(storageRef.current.verifiedTickets)]);
      
      setStats(prev => ({
        ...prev,
        verified: prev.verified + 1,
        attendance: prev.attendance + 1
      }));
      
      setVerificationResult({
        success: true,
        message: '票据验证成功',
        ticket,
        verifiedTime: verificationTime
      });
      
      setTicketInfo(ticket);
      
      showNotification('入场成功', 'success');
    } catch (e) {
      console.error('保存验证记录失败:', e);
      showNotification('验证失败，请重试', 'error');
    }
  };
  
  // 显示通知
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // 移除验证记录（允许重新入场）
  const removeVerification = (ticketId) => {
    if (window.confirm('确定要移除此验证记录吗？这将允许该票再次入场。')) {
      if (storageRef.current.verifiedTickets[ticketId]) {
        delete storageRef.current.verifiedTickets[ticketId];
        
        // 保存到localStorage
        try {
          localStorage.setItem('onlyGameVerifiedTickets', JSON.stringify(storageRef.current.verifiedTickets));
          
          // 更新状态
          setVerifiedTickets([...Object.keys(storageRef.current.verifiedTickets)]);
          
          setStats(prev => ({
            ...prev,
            verified: prev.verified - 1,
            attendance: prev.attendance - 1
          }));
          
          showNotification('已移除验证记录', 'info');
          
          // 如果当前显示的结果是这个票，重置结果
          if (verificationResult && verificationResult.ticket && verificationResult.ticket.id === ticketId) {
            setVerificationResult(null);
            setTicketInfo(null);
          }
        } catch (e) {
          console.error('移除验证记录失败:', e);
          showNotification('操作失败，请重试', 'error');
        }
      }
    }
  };
  
  // 清空所有验证记录
  const clearAllVerifications = () => {
    if (window.confirm('确定要清空所有验证记录吗？此操作不可恢复，会允许所有票再次入场。')) {
      // 重置验证记录
      storageRef.current.verifiedTickets = {};
      
      // 保存到localStorage
      try {
        localStorage.setItem('onlyGameVerifiedTickets', JSON.stringify({}));
        
        // 更新状态
        setVerifiedTickets([]);
        
        setStats(prev => ({
          ...prev,
          verified: 0,
          attendance: 0
        }));
        
        showNotification('已清空所有验证记录', 'info');
        
        // 重置当前结果
        setVerificationResult(null);
        setTicketInfo(null);
      } catch (e) {
        console.error('清空验证记录失败:', e);
        showNotification('操作失败，请重试', 'error');
      }
    }
  };
  
  // 获取通知样式
  const getNotificationStyle = () => {
    const baseStyle = 'fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg z-50';
    
    if (!notification) return baseStyle;
    
    switch (notification.type) {
      case 'success':
        return `${baseStyle} bg-green-500 text-white`;
      case 'error':
        return `${baseStyle} bg-red-500 text-white`;
      case 'warning':
        return `${baseStyle} bg-yellow-500 text-white`;
      default:
        return `${baseStyle} bg-blue-500 text-white`;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">北京独立游戏ONLY1.0</h1>
          <p className="text-gray-600 mt-2">入场验票系统</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左侧：扫码和验证 */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">扫描电子票</h2>
              
              <div className="mb-4">
                {scanning ? (
                  <div className="flex flex-col items-center">
                    <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-3">
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 border-2 border-blue-500 opacity-50" />
                    </div>
                    <button
                      onClick={stopScanning}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      停止扫描
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startScanning}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    启动扫码
                  </button>
                )}
              </div>
              
              <div className="my-4 text-center text-gray-500">- 或 -</div>
              
              <form onSubmit={handleManualEntry} className="mb-3">
                <div className="flex">
                  <input
                    type="text"
                    value={manualTicketId}
                    onChange={(e) => setManualTicketId(e.target.value)}
                    placeholder="手动输入票号"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
                  >
                    验证
                  </button>
                </div>
              </form>
              
              <p className="text-xs text-gray-500">提示：可使用手机摄像头扫描电子票二维码，或手动输入票号进行验证</p>
            </div>
            
            {/* 统计信息 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">入场统计</h2>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500">已入场</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.attendance}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500">已验票</p>
                  <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500">总票数</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.total}</p>
                </div>
              </div>
              
              {verifiedTickets.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={clearAllVerifications}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                  >
                    清空验证记录
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* 右侧：验证结果和历史记录 */}
          <div>
            {/* 验证结果 */}
            {verificationResult && (
              <div className={`bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 ${verificationResult.success ? 'border-green-500' : 'border-red-500'}`}>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">验证结果</h2>
                
                <div className={`text-center py-3 mb-4 rounded-md ${verificationResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <p className="font-medium text-lg">{verificationResult.message}</p>
                </div>
                
                {ticketInfo && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">票号</p>
                        <p className="font-medium">{ticketInfo.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">姓名</p>
                        <p className="font-medium">{ticketInfo.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">电话</p>
                        <p className="font-medium">{ticketInfo.phone}</p>
                      </div>
                      {ticketInfo.email && (
                        <div>
                          <p className="text-xs text-gray-500">邮箱</p>
                          <p className="font-medium">{ticketInfo.email}</p>
                        </div>
                      )}
                      {verificationResult.verifiedTime && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">验证时间</p>
                          <p className="font-medium">{verificationResult.verifiedTime.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    
                    {verificationResult.success && (
                      <div className="mt-4 text-center">
                        <p className="text-green-600 font-bold text-2xl">入场成功</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* 最近验证记录 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">最近验证记录</h2>
              
              {verifiedTickets.length === 0 ? (
                <p className="text-gray-500 italic">尚未验证任何电子票</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">票号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {verifiedTickets.slice().reverse().map(ticketId => {
                        const record = storageRef.current.verifiedTickets[ticketId];
                        if (!record || !record.ticket) return null;
                        
                        return (
                          <tr key={ticketId}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">{ticketId.slice(0, 14)}...</td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">{record.ticket.name}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              {new Date(record.verifiedAt).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              <button
                                onClick={() => removeVerification(ticketId)}
                                className="text-red-600 hover:text-red-800"
                              >
                                撤销
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 通知提示 */}
      {notification && (
        <div className={getNotificationStyle()}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default TicketVerification;