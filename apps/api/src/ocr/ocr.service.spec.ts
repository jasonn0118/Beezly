import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from './ocr.service';

describe('OcrService', () => {
  let service: OcrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OcrService],
    }).compile();

    service = module.get<OcrService>(OcrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadImageWithFormatSupport', () => {
    it('should process image buffer successfully', async () => {
      // Create a simple test image buffer (1x1 pixel PNG)
      const testBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x02, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const result = await service.loadImageWithFormatSupport(testBuffer);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid image buffer', async () => {
      const invalidBuffer = Buffer.from('invalid image data');

      await expect(
        service.loadImageWithFormatSupport(invalidBuffer),
      ).rejects.toThrow('Error loading image:');
    });
  });

  describe('isHeicBuffer', () => {
    it('should detect HEIC format correctly', () => {
      // Mock HEIC buffer with correct header
      const heicBuffer = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20]), // size
        Buffer.from('ftyp'), // type
        Buffer.from('heic'), // brand
        Buffer.from([0x00, 0x00, 0x00, 0x00]), // minor version
        Buffer.from('mif1heic'), // compatible brands
      ]);

      const result = service['isHeicBuffer'](heicBuffer);
      expect(result).toBe(true);
    });

    it('should return false for non-HEIC buffer', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      const result = service['isHeicBuffer'](pngBuffer);
      expect(result).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = service['isHeicBuffer'](emptyBuffer);
      expect(result).toBe(false);
    });
  });

  describe('compressImageForAzure', () => {
    it('should compress image buffer', async () => {
      const testBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x02, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const result = await service.compressImageForAzure(testBuffer, 1);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('processReceipt', () => {
    it('should throw error when no Azure credentials provided', async () => {
      const testBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x02, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      await expect(service.processReceipt(testBuffer)).rejects.toThrow(
        'Only Azure OCR is currently supported. Please provide Azure credentials.',
      );
    });

    it('should throw error when Azure credentials are invalid', async () => {
      const testBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x02, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      await expect(
        service.processReceipt(testBuffer, 'invalid-endpoint', 'invalid-key'),
      ).rejects.toThrow('Error processing receipt:');
    });
  });

  describe('extractItemsFromTextFallback', () => {
    it('should extract items from text lines', () => {
      const testLines = [
        'Store Name',
        'Apple $2.99',
        'Banana $1.50',
        '2 Orange $3.00',
        'Tax $0.50',
        'Total $8.99',
      ];

      const result = service['extractItemsFromTextFallback'](testLines);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'Apple',
        price: '$2.99',
        quantity: '1',
      });
      expect(result[1]).toEqual({
        name: 'Banana',
        price: '$1.50',
        quantity: '1',
      });
      expect(result[2]).toEqual({
        name: 'Orange',
        price: '$3.00',
        quantity: '2',
      });
    });

    it('should skip non-item lines', () => {
      const testLines = [
        'Store Name',
        'Thank you for shopping',
        'Total $8.99',
        'Tax $0.50',
        'Phone: 555-1234',
      ];

      const result = service['extractItemsFromTextFallback'](testLines);
      expect(result).toHaveLength(0);
    });
  });
});
