export const BOT_NAME = 'Appeal for SAP';

export function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size),
  );
}

export const ADMINS = [7559785750, 847525699];

export const GROUP_ID = -1002520324234;
