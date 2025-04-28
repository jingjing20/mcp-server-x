import { z } from "zod";

export const GetWeatherInput = {
  city: z.string().describe("城市名称，如北京、上海、广州等"),
};

export const GetRouteInput = {
  origin: z.string().describe("起点位置，如北京南站、上海外滩等地点名称"),
  destination: z.string().describe("终点位置，如北京西站、上海虹桥火车站等地点名称"),
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