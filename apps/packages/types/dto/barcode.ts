export enum BarcodeType {
  CODE39 = 'code39',
  EAN8 = 'ean8',
  EAN13 = 'ean13',
  CODABAR = 'codabar',
  ITF14 = 'itf14',
  CODE128 = 'code128',
  UPC_A = 'upc_a',
  UPC_E = 'upc_e',
}

export const BARCODE_TYPES = Object.values(BarcodeType);

export interface BarcodeDTO {
  type: BarcodeType;
  value: string;
}