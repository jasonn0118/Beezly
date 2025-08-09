import { useState, useEffect } from 'react';
import ProductService, { Barcode, Product, UseProductInfoProps } from '../services/productService';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export function useProductInfo({ scannedData, productId }: UseProductInfoProps) {
    const { isAuthenticated } = useAuth();
    const [productInfo, setProductInfo] = useState<Product | Barcode | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [scoringResult, setScoringResult] = useState<{
        pointsAwarded: number;
        newBadges: number;
        rankChange?: any;
    } | null>(null);

    useEffect(() => {
        const fetchProductData = async () => {
            setLoading(true);
            setError(null);
            setProductInfo(null);

            try {
                let response: Barcode | Product | undefined;
                let scanResult: any = null;

                if (scannedData?.barcode) {
                    if (isAuthenticated) {
                        // Use authenticated scan endpoint for points
                        scanResult = await ProductService.scanBarcode(
                            scannedData.barcode, 
                            scannedData.type
                        );
                        
                        if (scanResult.success && scanResult.product) {
                            response = scanResult.product;
                        }

                        // Store scoring information
                        setScoringResult({
                            pointsAwarded: scanResult.pointsAwarded || 0,
                            newBadges: scanResult.newBadges || 0,
                            rankChange: scanResult.rankChange,
                        });
                    } else {
                        // Use public endpoint for non-authenticated users
                        response = await ProductService.getBarcode(scannedData.barcode);
                    }
                } else if (productId) {
                    response = await ProductService.getProduct(productId);
                }
                
                if (response) { 
                    setProductInfo(response);
                }
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 404) {
                    console.log('Product not found for barcode:', scannedData?.barcode);
                    return null;
                }
                if (axios.isAxiosError(err) && err.response) {
                    const serverMessage = err.response.data.message || 'An unknown error occurred on the server.';
                    console.log('server response data:', err.response.data);
                    console.log(serverMessage);
                }
                console.error('GET CALL ERROR:', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };
        if(productId || scannedData?.barcode){
            fetchProductData();
        }else{
            setLoading(false);
        }
    }, [productId, scannedData?.barcode, isAuthenticated]);

    return { productInfo, loading, error, scoringResult };
}