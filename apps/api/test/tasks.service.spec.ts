import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TasksService } from '../src/tasks/tasks.service';
import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  categories?: string;
  categories_tags?: string[];
  image_url?: string;
  last_modified_t: number;
  brands_tags?: string[];
  packaging_codes?: string;
}

interface SupabaseFromClient {
  select: jest.Mock;
  insert: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
}

interface MockSupabaseClient {
  from: (table: string) => SupabaseFromClient;
}

interface MockOpenAIClient {
  chat: {
    completions: {
      create: jest.Mock<
        Promise<{ choices: { message: { content: string } }[] }>
      >;
    };
  };
}

// ---------- Mocks ----------
const mockFromReturn: SupabaseFromClient = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ error: null }),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: {
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }, // 3일 전
    error: null,
  }),
};

const mockSupabase: MockSupabaseClient = {
  from: jest.fn((table: string) => {
    if (table === 'Product' || table === 'Category') {
      return mockFromReturn;
    }
    return {
      select: jest.fn().mockReturnValue({ data: [], error: null }),
    } as any;
  }),
};

const mockOpenAI: MockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn(() =>
        Promise.resolve({
          choices: [{ message: { content: 'Food > Snacks > Chips' } }],
        }),
      ),
    },
  },
};

// ---------- Custom TestTasksService ----------
class TestTasksService extends TasksService {
  constructor(config: ConfigService) {
    super(
      config,
      mockSupabase as unknown as SupabaseClient<any, 'public', any>,
      mockOpenAI as unknown as OpenAI,
    );
  }

  override async fetchCategoryMap(): Promise<Record<string, number>> {
    return {
      'food > snacks > chips': 1,
    };
  }

  override async fetchProducts(): Promise<OpenFoodFactsProduct[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastModified = Math.floor(yesterday.getTime() / 1000);

    return Promise.resolve([
      {
        code: '1234567890123',
        product_name: 'Test Chips',
        categories: 'snacks,chips',
        categories_tags: ['en:snacks', 'en:chips'],
        last_modified_t: lastModified,
        image_url: 'http://example.com/image.jpg',
        brands_tags: ['testbrand'],
        packaging_codes: 'mock',
      },
    ]);
  }

  override async getLatestCreatedAt(): Promise<Date> {
    const date = new Date();
    date.setDate(date.getDate() - 2); // 2일 전
    return date;
  }
}

// ---------- Test Suite ----------
describe('TasksService (safe unit test)', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        {
          provide: TasksService,
          useFactory: (config: ConfigService) => new TestTasksService(config),
          inject: [ConfigService],
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string): string => {
              const map: Record<string, string> = {
                NEXT_PUBLIC_SUPABASE_URL: 'mock_url',
                NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock_key',
                OPENAI_API: 'mock_openai_key',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should insert product using mocked dependencies', async () => {
    await service.run();

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    expect(mockFromReturn.insert).toHaveBeenCalled();
  });
});
