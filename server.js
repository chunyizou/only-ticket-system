// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// 提供静态文件
app.use(express.static(path.join(__dirname, 'dist')));

// 所有的请求都返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});