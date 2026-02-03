// @ts-check
import { LoggerCore } from './logger.core';
import { appDataPath } from './store';
import path from 'path';

export function Logger(...name: any[]) {
	return new LoggerCore(path.join(appDataPath, 'logs'), true, ...name);
}
