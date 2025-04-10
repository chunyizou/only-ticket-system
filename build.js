const { execSync } = require('child_process');

try {
  console.log('开始构建项目...');
  execSync('node ./node_modules/webpack/bin/webpack.js --mode production', { stdio: 'inherit' });
  console.log('构建完成!');
} catch (error) {
  console.error('构建失败:', error);
  process.exit(1);
}