import { Test, TestingModule } from '@nestjs/testing';
import { BarcodeController } from './barcode.controller';
import { BarcodeService } from './barcode.service';
import { BarcodeType } from '@beezly/types';

describe('BarcodeController', () => {
  let controller: BarcodeController;

  const mockBarcodeService = {
    getProductByBarcode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarcodeController],
      providers: [
        {
          provide: BarcodeService,
          useValue: mockBarcodeService,
        },
      ],
    }).compile();

    controller = module.get<BarcodeController>(BarcodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProductByBarcode', () => {
    it('should call service.getProductByBarcode with correct parameters', async () => {
      const mockResponse = {
        id: 'test-id',
        name: 'Test Product',
        barcode: '1234567890',
        isVerified: true,
      };
      mockBarcodeService.getProductByBarcode.mockResolvedValue(mockResponse);

      const result = await controller.getProductByBarcode('1234567890');

      expect(mockBarcodeService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should call service.getProductByBarcode with barcode type when provided', async () => {
      const mockResponse = {
        id: 'test-id',
        name: 'Test Product',
        barcode: '1234567890',
        barcodeType: BarcodeType.EAN13,
        isVerified: true,
      };
      mockBarcodeService.getProductByBarcode.mockResolvedValue(mockResponse);

      const result = await controller.getProductByBarcode(
        '1234567890',
        BarcodeType.EAN13,
      );

      expect(mockBarcodeService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
        BarcodeType.EAN13,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
