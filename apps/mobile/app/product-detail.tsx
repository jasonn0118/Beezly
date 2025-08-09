import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProductInfo } from '../src/hooks/useProductInfo';
import { ProductDetailView } from '../src/components/scan/ProductDetailView';
import {ScannedDataParam } from '../src/services/productService';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { productId, scannedData : scannedDataString} = useLocalSearchParams<{ productId?: string; scannedData?: string }>();
  const scannedData: ScannedDataParam | undefined = scannedDataString
    ? JSON.parse(scannedDataString)
    : undefined;
    
  const { productInfo, loading, scoringResult } = useProductInfo({ 
    productId: productId,
    scannedData: scannedData 
  });

  useEffect(() => {
    if (!loading && !productInfo && scannedData) {
      router.replace(`/register-prompt?scannedData=${JSON.stringify(scannedData)}`);
    }
  }, [loading, productInfo, scannedData, router]);

  return <ProductDetailView productInfo={productInfo} loading={loading} scannedData={scannedData} scoringResult={scoringResult} />;
}
