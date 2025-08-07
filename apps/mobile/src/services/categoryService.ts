import { apiClient } from './api';

export interface CategoryTreeDTO {
    id: number;
    name: string;
    value: string;
    subcategories: CategoryTreeDTO[];
}

export class CategoryService {
  static async getCategoryTree(): Promise<CategoryTreeDTO[]> {
    const response = await apiClient.get<{ categories: CategoryTreeDTO[] }>('/category/tree');
    return response.categories;
  }
}

export default CategoryService;
