import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const AMAP_API_KEY = "2e645bee34ad494cfbd9baceccb351d0";
const WEATHER_API_BASE = "https://restapi.amap.com/v3/weather/weatherInfo";
const DRIVING_API_BASE = "https://restapi.amap.com/v5/direction/driving";

// 天气接口响应类型
interface WeatherResponse {
  status: string;
  count: string;
  info: string;
  infocode: string;
  forecasts: WeatherForecast[];
}

interface WeatherForecast {
  city: string;
  adcode: string;
  province: string;
  reporttime: string;
  casts: WeatherCast[];
}

interface WeatherCast {
  date: string;
  week: string;
  dayweather: string;
  nightweather: string;
  daytemp: string;
  nighttemp: string;
  daywind: string;
  nightwind: string;
  daypower: string;
  nightpower: string;
  daytemp_float: string;
  nighttemp_float: string;
}

// 路线规划接口响应类型
interface DrivingResponse {
  status: string;
  info: string;
  infocode: string;
  count: string;
  route: {
    origin: string;
    destination: string;
    taxi_cost: string;
    paths: DrivingPath[];
  };
}

interface DrivingPath {
  distance: string;
  restriction: string;
  steps: DrivingStep[];
}

interface DrivingStep {
  instruction: string;
  orientation: string;
  road_name?: string;
  step_distance: string;
}

// 请求高德API的通用函数
async function makeAMapRequest<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making AMap request:", error);
    return null;
  }
}

// 格式化天气数据
function formatWeatherForecast(forecast: WeatherForecast): string {
  const cityInfo = `${forecast.province} ${forecast.city} (${forecast.adcode})`;
  const reportTime = `报告时间: ${forecast.reporttime}`;

  const castFormatted = forecast.casts.map((cast) => {
    return [
      `日期: ${cast.date} (星期${cast.week})`,
      `白天: ${cast.dayweather}, ${cast.daytemp}°C, ${cast.daywind}风 ${cast.daypower}级`,
      `夜间: ${cast.nightweather}, ${cast.nighttemp}°C, ${cast.nightwind}风 ${cast.nightpower}级`,
      "---"
    ].join("\n");
  });

  return `${cityInfo}\n${reportTime}\n\n${castFormatted.join("\n")}`;
}

// 格式化路线规划数据
function formatDrivingRoute(drivingData: DrivingResponse): string {
  const route = drivingData.route;
  const path = route.paths[0]; // 取第一条路径

  const originDestInfo = `从 ${route.origin} 到 ${route.destination}`;
  const basicInfo = `总距离: ${(parseInt(path.distance) / 1000).toFixed(1)}公里 | 预计打车费用: ${route.taxi_cost}元`;

  const stepsFormatted = path.steps.map((step, index) => {
    const roadInfo = step.road_name ? `沿${step.road_name}` : "";
    return `${index + 1}. ${roadInfo} ${step.instruction} (${step.step_distance}米)`;
  });

  return `${originDestInfo}\n${basicInfo}\n\n导航指引:\n${stepsFormatted.join("\n")}`;
}

// 创建服务器实例
const server = new McpServer({
  name: "china-weather-map",
  version: "1.0.0",
});

// 注册天气查询工具
server.tool(
  "get-weather",
  "获取中国城市天气预报",
  {
    city: z.string().describe("城市编码，如北京:110000，上海:310000"),
  },
  async ({ city }: { city: string }) => {
    const weatherUrl = `${WEATHER_API_BASE}?key=${AMAP_API_KEY}&city=${city}&extensions=all`;
    const weatherData = await makeAMapRequest<WeatherResponse>(weatherUrl);

    if (!weatherData) {
      return {
        content: [
          {
            type: "text",
            text: "获取天气数据失败",
          },
        ],
      };
    }

    if (weatherData.status !== "1") {
      return {
        content: [
          {
            type: "text",
            text: `请求错误: ${weatherData.info} (代码: ${weatherData.infocode})`,
          },
        ],
      };
    }

    const forecasts = weatherData.forecasts || [];
    if (forecasts.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `未找到城市 ${city} 的天气预报`,
          },
        ],
      };
    }

    const formattedForecasts = forecasts.map(formatWeatherForecast);
    const weatherText = `${city} 未来天气预报:\n\n${formattedForecasts.join("\n\n")}`;

    return {
      content: [
        {
          type: "text",
          text: weatherText,
        },
      ],
    };
  },
);

// 注册路线规划工具
server.tool(
  "get-route",
  "获取驾车路线规划",
  {
    origin: z.string().describe("起点坐标，格式：经度,纬度，如 116.481488,39.990464"),
    destination: z.string().describe("终点坐标，格式：经度,纬度，如 116.403124,39.940693"),
  },
  async ({ origin, destination }: { origin: string, destination: string }) => {
    const drivingUrl = `${DRIVING_API_BASE}?key=${AMAP_API_KEY}&origin=${origin}&destination=${destination}&strategy=0`;
    const drivingData = await makeAMapRequest<DrivingResponse>(drivingUrl);

    if (!drivingData) {
      return {
        content: [
          {
            type: "text",
            text: "获取路线规划数据失败",
          },
        ],
      };
    }

    if (drivingData.status !== "1") {
      return {
        content: [
          {
            type: "text",
            text: `请求错误: ${drivingData.info} (代码: ${drivingData.infocode})`,
          },
        ],
      };
    }

    const formattedRoute = formatDrivingRoute(drivingData);
    const routeText = `驾车路线规划结果:\n\n${formattedRoute}`;

    return {
      content: [
        {
          type: "text",
          text: routeText,
        },
      ],
    };
  },
);

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("China Weather and Map MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});