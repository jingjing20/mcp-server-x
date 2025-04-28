import { z } from "zod";

export const GetWeatherInput = {
  city: z.string().describe("城市编码，如北京:110000，上海:310000"),
};

export const GetRouteInput = {
  origin: z.string().describe("起点坐标，格式：经度,纬度，如 116.481488,39.990464"),
  destination: z.string().describe("终点坐标，格式：经度,纬度，如 116.403124,39.940693"),
};

// 导出工具定义供外部系统使用
export const tools = [
  {
    name: "get-weather",
    description: "获取中国城市天气预报",
    schema: GetWeatherInput
  },
  {
    name: "get-route",
    description: "获取驾车路线规划",
    schema: GetRouteInput
  }
];