import { ApiProperty } from "@nestjs/swagger";

export class StorePriceDTO {
  @ApiProperty({
    example: "Walmart",
    description: "Name of the store offering the product",
  })
  storeName: string;

  @ApiProperty({
    example: 19.99,
    description: "Price of the product at this store",
  })
  price: number;

  @ApiProperty({
    example: "USD",
    description: "Currency of the product price",
  })
  currency: string;

  @ApiProperty({
    example: 1500,
    description: "Distance to the store in meters",
  })
  distance: number; // meters or km
}

export class PriceComparisonDTO {
  @ApiProperty({
    example: "Colgate Toothpaste 120g",
    description: "Name of the product being compared",
  })
  productName: string;

  @ApiProperty({
    type: [StorePriceDTO],
    description: "List of stores with their prices and distances",
  })
  storeList: StorePriceDTO[];
}
