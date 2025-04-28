// 中国天气地图服务示例
// 需要先构建并安装服务

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// 启动MCP服务
const mcpService = spawn('china-weather-map', []);

// 创建输入输出接口
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// 设置服务输出处理
mcpService.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    if (response.content && response.content.length > 0) {
      console.log('\n结果:');
      console.log(response.content[0].text);
    }
    promptUser();
  } catch (error) {
    console.error('解析响应失败:', error);
    promptUser();
  }
});

mcpService.stderr.on('data', (data) => {
  console.error(`服务日志: ${data}`);
});

// 发送请求到MCP服务
function sendRequest(request) {
  mcpService.stdin.write(JSON.stringify(request) + '\n');
}

// 查询天气示例
function getWeather(city) {
  const request = {
    id: Date.now().toString(),
    request: {
      tool: 'get-weather',
      params: { city }
    }
  };
  sendRequest(request);
}

// 路线规划示例
function getRoute(origin, destination) {
  const request = {
    id: Date.now().toString(),
    request: {
      tool: 'get-route',
      params: { origin, destination }
    }
  };
  sendRequest(request);
}

// 用户交互界面
function promptUser() {
  console.log('\n请选择功能:');
  console.log('1. 查询天气');
  console.log('2. 规划路线');
  console.log('3. 退出');

  rl.question('请输入选项 (1-3): ', (choice) => {
    switch (choice) {
      case '1':
        rl.question('请输入城市编码 (例如：北京 110000): ', (city) => {
          getWeather(city);
        });
        break;
      case '2':
        rl.question('请输入起点坐标 (例如：116.481488,39.990464): ', (origin) => {
          rl.question('请输入终点坐标 (例如：116.403124,39.940693): ', (destination) => {
            getRoute(origin, destination);
          });
        });
        break;
      case '3':
        console.log('正在退出...');
        mcpService.kill();
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('无效选项，请重新选择');
        promptUser();
    }
  });
}

// 启动交互界面
console.log('中国天气地图服务示例');
console.log('====================');
promptUser();

// 处理程序退出
process.on('exit', () => {
  mcpService.kill();
});

process.on('SIGINT', () => {
  console.log('\n正在退出...');
  mcpService.kill();
  process.exit(0);
});