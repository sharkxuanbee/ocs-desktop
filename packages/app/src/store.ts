import { app, safeStorage } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { existsSync, mkdirSync } from 'fs';

function getAppDataPath() {
	if (process.platform === 'linux') {
		const appImagePath = process.env.APPIMAGE;
		if (appImagePath) {
			const appDir = path.dirname(appImagePath);
			const dataDir = path.join(appDir, 'ocs-data');
			if (!existsSync(dataDir)) {
				mkdirSync(dataDir, { recursive: true });
			}
			return dataDir;
		}
	}
	return app.getPath('userData');
}

const appDataPath = getAppDataPath();

export { appDataPath };

// IO操作只能在 app.getPath('userData') 下进行，否则会有权限问题。

export const OriginalAppStore = {
	name: app.getName(),
	version: app.getVersion(),
	paths: {
		'app-path': app.getAppPath(),
		'user-data-path': appDataPath,
		'exe-path': app.getPath('exe'),
		'logs-path': path.join(appDataPath, 'logs'),
		'config-path': path.join(appDataPath, 'config.json'),
		userDataDirsFolder: '',
		downloadFolder: path.join(appDataPath, 'downloads'),
		extensionsFolder: path.join(appDataPath, 'downloads', 'extensions')
	},
	/** 软件设置 */
	app: {
		video_frame_rate: 1,
		data_encryption: false
	},
	/** 窗口设置 */
	window: {
		/** 开机自启 */
		alwaysOnTop: false,
		autoLaunch: false
	},
	/** 本地服务器数据 */
	server: {
		port: 15319,
		authToken: ''
	},
	/** 渲染进程数据 */
	render: {} as { [x: string]: any }
};

/**
 * - electron 本地存储对象
 * - 可以使用 store.store 访问
 * - 设置数据请使用 store.set('key', value)
 */
export const store = new Store<typeof OriginalAppStore>();

/**
 * 获取解密后的渲染进程数据
 */
export function getDecryptedRenderData(): (typeof OriginalAppStore)['render'] {
	if (typeof store?.store?.render === 'string') {
		return JSON.parse(safeStorage.decryptString(Buffer.from(store?.store?.render, 'base64')));
	}
	return store?.store?.render || {};
}
