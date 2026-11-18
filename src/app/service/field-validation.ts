export const FIELD_PATTERNS = {
  personName: "^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$",
  email: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$',
  password: '^(?=.*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?=.*[0-9]).{8,72}$',
  productName: "^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ][A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .,'()&/-]*$",
  category: "^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ][A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ &'()/,-]*$",
  quantity: "^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ][A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .,/()'-]*$",
  barcode: '^[0-9]{8,14}$',
  search: "^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .,'&()/+-]*$",
} as const;

export const FIELD_REGEX = {
  personName: new RegExp(FIELD_PATTERNS.personName),
  email: new RegExp(FIELD_PATTERNS.email),
  password: new RegExp(FIELD_PATTERNS.password),
  productName: new RegExp(FIELD_PATTERNS.productName),
  category: new RegExp(FIELD_PATTERNS.category),
  quantity: new RegExp(FIELD_PATTERNS.quantity),
  barcode: new RegExp(FIELD_PATTERNS.barcode),
  search: new RegExp(FIELD_PATTERNS.search),
} as const;

export function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}
