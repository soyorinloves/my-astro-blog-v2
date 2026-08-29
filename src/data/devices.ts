// 设备数据配置文件（数据本体在 devices.json，便于在线编辑）
import devicesJson from "./devices.json";

export interface Device {
	name: string;
	image: string;
	specs: string;
	description: string;
	link: string;
}

// 设备类别类型，支持品牌和自定义类别
export type DeviceCategory = Record<string, Device[]> & {
	自定义?: Device[];
};

export const devicesData: DeviceCategory = devicesJson as DeviceCategory;
