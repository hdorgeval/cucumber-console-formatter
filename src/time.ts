import { messages } from '@cucumber/messages';
export function dateToFilename(date: Date): string {
  const filename = date.toISOString().replace(/\./g, '-').replace(/:/g, '-').trim();
  return filename;
}

// part of the below code is inspired from the cucumber-js source code
export const MILLISECONDS_IN_SECOND = 1e3;

export function toNumber(x: number | Long): number {
  return typeof x === 'number' ? x : x.toNumber();
}

export function toMilliseconds(timestamp: messages.ITimestamp | null | undefined): number {
  const now = Date.now();
  return timestamp?.seconds ? toNumber(timestamp.seconds) * MILLISECONDS_IN_SECOND : now;
}

export function toFormattedDate(timestamp: messages.ITimestamp | null | undefined): string {
  const timestampDateTime = new Date(toMilliseconds(timestamp));

  const year = timestampDateTime.toLocaleString('default', {
    year: 'numeric',
  });
  const month = timestampDateTime.toLocaleString('default', {
    month: '2-digit',
  });

  const day = timestampDateTime.toLocaleString('default', {
    day: '2-digit',
  });

  const time = timestampDateTime.toLocaleTimeString('default', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${year}/${month}/${day} ${time}`;
}
