import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const AMAP_API_KEY = "2e645bee34ad494cfbd9baceccb351d0";
const WEATHER_API_BASE = "https://restapi.amap.com/v3/weather/weatherInfo";
const DRIVING_API_BASE = "https://restapi.amap.com/v5/direction/driving";
const GEOCODE_API_BASE = "https://restapi.amap.com/v3/geocode/geo";
const DISTRICT_API_BASE = "https://restapi.amap.com/v3/config/district";

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

// 地理编码接口响应类型
interface GeoCodeResponse {
  status: string;
  info: string;
  infocode: string;
  count: string;
  geocodes: GeoCode[];
}

interface GeoCode {
  formatted_address: string;
  country: string;
  province: string;
  citycode: string;
  city: string;
  district: string;
  adcode: string;
  location: string;
  level: string;
}

// 城市区域接口响应类型
interface DistrictResponse {
  status: string;
  info: string;
  infocode: string;
  count: string;
  districts: District[];
}

interface District {
  citycode: string;
  adcode: string;
  name: string;
  level: string;
  districts?: District[];
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

// 地理编码：地址转坐标
async function getLocationByAddress(address: string): Promise<{ location: string; formatted_address: string } | null> {
  const url = `${GEOCODE_API_BASE}?key=${AMAP_API_KEY}&address=${encodeURIComponent(address)}`;
  const response = await makeAMapRequest<GeoCodeResponse>(url);

  if (!response || response.status !== "1" || !response.geocodes || response.geocodes.length === 0) {
    return null;
  }

  return {
    location: response.geocodes[0].location,
    formatted_address: response.geocodes[0].formatted_address
  };
}

// 获取城市编码
async function getCityCode(cityName: string): Promise<string | null> {
  // 先尝试用地理编码API
  const url = `${GEOCODE_API_BASE}?key=${AMAP_API_KEY}&address=${encodeURIComponent(cityName)}`;
  const response = await makeAMapRequest<GeoCodeResponse>(url);

  if (response && response.status === "1" && response.geocodes && response.geocodes.length > 0) {
    return response.geocodes[0].adcode;
  }

  // 如果找不到，尝试使用行政区域查询
  const districtUrl = `${DISTRICT_API_BASE}?key=${AMAP_API_KEY}&keywords=${encodeURIComponent(cityName)}&subdistrict=0`;
  const districtResponse = await makeAMapRequest<DistrictResponse>(districtUrl);

  if (districtResponse && districtResponse.status === "1" && districtResponse.districts && districtResponse.districts.length > 0) {
    return districtResponse.districts[0].adcode;
  }

  return null;
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
function formatDrivingRoute(drivingData: DrivingResponse, originName: string, destName: string): string {
  const route = drivingData.route;
  const path = route.paths[0]; // 取第一条路径

  const originDestInfo = `从 ${originName} 到 ${destName}`;
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
    city: z.string().describe("城市名称，如北京、上海、广州等"),
  },
  async ({ city }: { city: string }) => {
    // 根据城市名称获取城市编码
    const cityCode = await getCityCode(city);

    if (!cityCode) {
      return {
        content: [
          {
            type: "text",
            text: `无法找到城市 "${city}" 的编码，请检查城市名称是否正确`,
          },
        ],
      };
    }

    const weatherUrl = `${WEATHER_API_BASE}?key=${AMAP_API_KEY}&city=${cityCode}&extensions=all`;
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
            text: `未找到城市 ${city} (${cityCode}) 的天气预报`,
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
    origin: z.string().describe("起点位置，如北京南站、上海外滩等地点名称"),
    destination: z.string().describe("终点位置，如北京西站、上海虹桥火车站等地点名称"),
  },
  async ({ origin, destination }: { origin: string, destination: string }) => {
    // 获取起点坐标
    const originGeo = await getLocationByAddress(origin);
    if (!originGeo) {
      return {
        content: [
          {
            type: "text",
            text: `无法找到地点 "${origin}" 的坐标，请提供更准确的地点名称`,
          },
        ],
      };
    }

    // 获取终点坐标
    const destGeo = await getLocationByAddress(destination);
    if (!destGeo) {
      return {
        content: [
          {
            type: "text",
            text: `无法找到地点 "${destination}" 的坐标，请提供更准确的地点名称`,
          },
        ],
      };
    }

    const drivingUrl = `${DRIVING_API_BASE}?key=${AMAP_API_KEY}&origin=${originGeo.location}&destination=${destGeo.location}&strategy=0`;
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

    const formattedRoute = formatDrivingRoute(drivingData, originGeo.formatted_address, destGeo.formatted_address);
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