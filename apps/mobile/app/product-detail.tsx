import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useProductInfo } from '../src/hooks/useProductInfo';
import { ProductDetailView } from '../src/components/scan/ProductDetailView';
import {ScannedDataParam } from '../src/services/productService';

export default function ProductDetailScreen() {
  const { productId, scannedData : scannedDataString} = useLocalSearchParams<{ productId?: string; scannedData?: string }>();
  const scannedData: ScannedDataParam | undefined = scannedDataString
    ? JSON.parse(scannedDataString)
    : undefined;
    
  const { productInfo, loading } = useProductInfo({ 
    productId: productId,
    scannedData: scannedData 
  });

  return <ProductDetailView productInfo={productInfo} loading={loading} scannedData={scannedData} />;
}
