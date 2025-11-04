export const CAR_PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export const normalizeCarPlate = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 7);

export const isValidCarPlate = (value: string) => {
  const normalized = normalizeCarPlate(value);
  return normalized.length === 7 && CAR_PLATE_REGEX.test(normalized);
};
