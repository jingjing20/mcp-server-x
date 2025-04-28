# China Weather and Map MCP 服务使用指南

这个 MCP 服务提供两个工具：
1. 获取中国城市天气预报 (`get-weather`)
2. 获取驾车路线规划 (`get-route`)

## 安装方法

1. 克隆此仓库
2. 进入项目目录
```
cd packages/china-weather-map
```
3. 安装依赖
```
npm install
```
4. 构建项目
```
npm run build
```
5. 全局安装（可选）
```
npm link
```

## 使用方法

### 作为命令行工具

如果你已全局安装，可以直接使用：

```bash
china-weather-map
```

### 在 Claude 中使用

在 Claude 中，你可以使用以下工具：

1. 查询天气：

```
mcp_china-weather-map_get-weather(city="110000")
```

2. 规划路线：

```
mcp_china-weather-map_get-route(origin="116.481488,39.990464", destination="116.403124,39.940693")
```

## 参数说明

### get-weather

| 参数 | 说明 | 示例 |
|------|------|------|
| city | 城市编码 | 北京: 110000, 上海: 310000 |

### get-route

| 参数 | 说明 | 示例 |
|------|------|------|
| origin | 起点坐标，格式：经度,纬度 | 116.481488,39.990464 |
| destination | 终点坐标，格式：经度,纬度 | 116.403124,39.940693 |

## 常用城市编码参考

- 北京: 110000
- 上海: 310000
- 广州: 440100
- 深圳: 440300
- 杭州: 330100
- 成都: 510100
- 重庆: 500000
- 天津: 120000
- 南京: 320100
- 武汉: 420100

## 高德地图坐标获取方法

你可以通过高德地图官网 (https://lbs.amap.com/tools/picker) 的坐标拾取工具获取任意位置的经纬度坐标。