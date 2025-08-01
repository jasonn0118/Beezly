import { apiClient } from './api';

export interface category {
  id: string;
  parentId: string;
  name: string;
  slug?: string;
  level?: string;
  use_yn?: boolean;
}

export class categoryService {
    static async getAllCategories(): Promise<category[]> {
        return apiClient.get<category[]>(`/category`);
    }
    static async getCategories(id: string): Promise<category[]> {
        return apiClient.get<category[]>(`/category/${id}`);
    }
    static async getCategoriesPivot(): Promise<category[]> {
        return apiClient.get<category[]>(`/categoryPivot`);
    }
}
