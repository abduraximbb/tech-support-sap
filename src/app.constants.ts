export const BOT_NAME = 'Appeal for SAP';

export function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size),
  );
}

export const ADMINS = [7559785750, 847525699];

export const GROUP_ID = -1002520324234;

export  const formatDateTime = (date: Date): string => {
  if (date) {
    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(/\//g, '.')
      .replace(',', '');
  } else {
    return '-';
  }
};