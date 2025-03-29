import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService {
  private logDir = path.join(__dirname, '../../logs');
  private infoLogFile = path.join(this.logDir, 'info.log');
  private errorLogFile = path.join(this.logDir, 'error.log');

  constructor() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  logInfo(message: string) {
    const location = this.getCallerLocation();
    this.writeLog('INFO', `${message} (${location})`, this.infoLogFile);
  }

  logError(message: string, error?: Error) {
    const location = this.getCallerLocation();
    const stackTrace = error?.stack ? `\nStack Trace:\n${error.stack}` : '';
    this.writeLog(
      'ERROR',
      `${message} (${location})${stackTrace}`,
      this.errorLogFile,
    );
  }

  private writeLog(level: string, message: string, filePath: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;

    fs.appendFile(filePath, logEntry, (err) => {
      if (err) console.error('Log yozishda xatolik:', err);
    });

    console.log(logEntry);
  }

  private getCallerLocation(): string {
    const error = new Error();
    const stackLines = error.stack?.split('\n') || [];

    // Stack ichidan 3-qatorda haqiqiy chaqirilgan joy bor
    const callerLine = stackLines[3]?.trim();

    if (callerLine) {
      const match = callerLine.match(/\((.*):(\d+):(\d+)\)/);
      if (match) {
        const filePath = match[1].split('/').slice(-2).join('/'); // Faqat oxirgi 2 katalogni olish
        return `${filePath}:${match[2]}`;
      }
    }
    return 'Unknown location';
  }
}
