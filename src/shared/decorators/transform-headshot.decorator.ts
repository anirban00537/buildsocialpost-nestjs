import { Transform } from 'class-transformer';

export function TransformHeadshot(prefix: string) {
  return Transform(({ value }) => {
    if (value && typeof value === 'string' && !value.startsWith(prefix)) {
      // Ensure prefix ends with a slash
      const adjustedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
      // Ensure value doesn't start with a slash
      const adjustedValue = value.startsWith('/') ? value.slice(1) : value;
      return `${adjustedPrefix}${adjustedValue}`;
    }
    return value;
  });
}
