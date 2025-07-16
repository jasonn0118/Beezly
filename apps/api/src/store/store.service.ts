import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreDTO } from '../../../packages/types/dto/store';
import { Store } from '../entities/store.entity';

export interface LocationSearch {
  latitude: number;
  longitude: number;
  radiusKm?: number; // Default to 10km if not specified
  limit?: number; // Default to 50 if not specified
}

export interface StoreDistance extends StoreDTO {
  distance: number; // Distance in kilometers
}

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  async getAllStores(): Promise<StoreDTO[]> {
    const stores = await this.storeRepository.find({
      relations: ['receipts'],
    });

    return stores.map(store => this.mapStoreToDTO(store));
  }

  async getStoreById(id: string): Promise<StoreDTO | null> {
    // Try to find by storeSk (UUID) first, then by id (integer)
    let store = await this.storeRepository.findOne({
      where: { storeSk: id },
      relations: ['receipts'],
    });

    // If not found by storeSk, try by integer id
    if (!store && !isNaN(Number(id))) {
      store = await this.storeRepository.findOne({
        where: { id: Number(id) },
        relations: ['receipts'],
      });
    }

    return store ? this.mapStoreToDTO(store) : null;
  }

  async getStoreByPlaceId(placeId: string): Promise<StoreDTO | null> {
    const store = await this.storeRepository.findOne({
      where: { placeId },
      relations: ['receipts'],
    });

    return store ? this.mapStoreToDTO(store) : null;
  }

  async createStore(storeData: Partial<StoreDTO>): Promise<StoreDTO> {
    const store = this.storeRepository.create({
      name: storeData.name,
      address: storeData.address,
      city: storeData.city,
      province: storeData.province,
      postalCode: storeData.postalCode,
      latitude: storeData.latitude,
      longitude: storeData.longitude,
      placeId: (storeData as any).placeId,
    });

    const savedStore = await this.storeRepository.save(store);
    return this.mapStoreToDTO(savedStore);
  }

  async updateStore(id: string, storeData: Partial<StoreDTO>): Promise<StoreDTO> {
    const store = await this.getStoreEntityById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    // Update fields
    if (storeData.name !== undefined) store.name = storeData.name;
    if (storeData.address !== undefined) store.address = storeData.address;
    if (storeData.city !== undefined) store.city = storeData.city;
    if (storeData.province !== undefined) store.province = storeData.province;
    if (storeData.postalCode !== undefined) store.postalCode = storeData.postalCode;
    if (storeData.latitude !== undefined) store.latitude = storeData.latitude;
    if (storeData.longitude !== undefined) store.longitude = storeData.longitude;
    if ((storeData as any).placeId !== undefined) store.placeId = (storeData as any).placeId;

    const updatedStore = await this.storeRepository.save(store);
    return this.mapStoreToDTO(updatedStore);
  }

  async deleteStore(id: string): Promise<void> {
    const store = await this.getStoreEntityById(id);
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    await this.storeRepository.remove(store);
  }

  // 🌍 GEOSPATIAL QUERY METHODS

  /**
   * Find stores within a specified radius of a location
   * Uses the Haversine formula for distance calculation
   */
  async findStoresNearLocation(location: LocationSearch): Promise<StoreDistance[]> {
    const { latitude, longitude, radiusKm = 10, limit = 50 } = location;

    const stores = await this.storeRepository
      .createQueryBuilder('store')
      .select([
        'store.*',
        `(
          6371 * acos(
            cos(radians(:latitude)) * 
            cos(radians(store.latitude)) * 
            cos(radians(store.longitude) - radians(:longitude)) + 
            sin(radians(:latitude)) * 
            sin(radians(store.latitude))
          )
        ) AS distance`
      ])
      .where('store.latitude IS NOT NULL')
      .andWhere('store.longitude IS NOT NULL')
      .having('distance <= :radiusKm')
      .orderBy('distance', 'ASC')
      .limit(limit)
      .setParameters({ latitude, longitude, radiusKm })
      .getRawMany();

    return stores.map(store => ({
      ...this.mapRawStoreToDTO(store),
      distance: parseFloat(store.distance),
    }));
  }

  /**
   * Find stores within a city
   */
  async findStoresByCity(city: string, limit: number = 50): Promise<StoreDTO[]> {
    const stores = await this.storeRepository.find({
      where: { city },
      take: limit,
      order: { name: 'ASC' },
    });

    return stores.map(store => this.mapStoreToDTO(store));
  }

  /**
   * Find stores within a province/state
   */
  async findStoresByProvince(province: string, limit: number = 50): Promise<StoreDTO[]> {
    const stores = await this.storeRepository.find({
      where: { province },
      take: limit,
      order: { city: 'ASC', name: 'ASC' },
    });

    return stores.map(store => this.mapStoreToDTO(store));
  }

  /**
   * Search stores by name (fuzzy search)
   */
  async searchStoresByName(name: string, limit: number = 50): Promise<StoreDTO[]> {
    const stores = await this.storeRepository
      .createQueryBuilder('store')
      .where('store.name ILIKE :name', { name: `%${name}%` })
      .orderBy('store.name', 'ASC')
      .limit(limit)
      .getMany();

    return stores.map(store => this.mapStoreToDTO(store));
  }

  /**
   * Get stores with the most receipts (popular stores)
   */
  async getPopularStores(limit: number = 20): Promise<StoreDTO[]> {
    const stores = await this.storeRepository
      .createQueryBuilder('store')
      .leftJoin('store.receipts', 'receipt')
      .loadRelationCountAndMap('store.receiptCount', 'store.receipts')
      .orderBy('store.receiptCount', 'DESC')
      .limit(limit)
      .getMany();

    return stores.map(store => this.mapStoreToDTO(store));
  }

  /**
   * Advanced search combining location and text search
   */
  async advancedStoreSearch(params: {
    name?: string;
    city?: string;
    province?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<StoreDistance[]> {
    const { name, city, province, latitude, longitude, radiusKm = 10, limit = 50 } = params;

    let query = this.storeRepository.createQueryBuilder('store');

    // Add distance calculation if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      query = query.select([
        'store.*',
        `(
          6371 * acos(
            cos(radians(:latitude)) * 
            cos(radians(store.latitude)) * 
            cos(radians(store.longitude) - radians(:longitude)) + 
            sin(radians(:latitude)) * 
            sin(radians(store.latitude))
          )
        ) AS distance`
      ])
      .setParameters({ latitude, longitude });
    } else {
      query = query.select('store.*');
    }

    // Add text filters
    if (name) {
      query = query.andWhere('store.name ILIKE :name', { name: `%${name}%` });
    }
    if (city) {
      query = query.andWhere('store.city ILIKE :city', { city: `%${city}%` });
    }
    if (province) {
      query = query.andWhere('store.province ILIKE :province', { province: `%${province}%` });
    }

    // Add distance filter if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      query = query
        .andWhere('store.latitude IS NOT NULL')
        .andWhere('store.longitude IS NOT NULL')
        .having('distance <= :radiusKm')
        .setParameter('radiusKm', radiusKm)
        .orderBy('distance', 'ASC');
    } else {
      query = query.orderBy('store.name', 'ASC');
    }

    const stores = await query.limit(limit).getRawMany();

    return stores.map(store => ({
      ...this.mapRawStoreToDTO(store),
      distance: store.distance ? parseFloat(store.distance) : 0,
    }));
  }

  // PRIVATE HELPER METHODS

  private async getStoreEntityById(id: string): Promise<Store | null> {
    // Try to find by storeSk (UUID) first, then by id (integer)
    let store = await this.storeRepository.findOne({
      where: { storeSk: id },
    });

    // If not found by storeSk, try by integer id
    if (!store && !isNaN(Number(id))) {
      store = await this.storeRepository.findOne({
        where: { id: Number(id) },
      });
    }

    return store;
  }

  private mapStoreToDTO(store: Store): StoreDTO {
    return {
      id: store.storeSk, // Use UUID as the public ID
      name: store.name,
      address: store.address,
      city: store.city,
      province: store.province,
      postalCode: store.postalCode,
      latitude: store.latitude,
      longitude: store.longitude,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  private mapRawStoreToDTO(rawStore: any): StoreDTO {
    return {
      id: rawStore.store_sk,
      name: rawStore.name,
      address: rawStore.address,
      city: rawStore.city,
      province: rawStore.province,
      postalCode: rawStore.postal_code,
      latitude: rawStore.latitude,
      longitude: rawStore.longitude,
      createdAt: rawStore.created_at,
      updatedAt: rawStore.updated_at,
    };
  }
}