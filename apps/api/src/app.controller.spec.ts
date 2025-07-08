import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getUsers', () => {
    it('should return an array of users', async () => {
      const users = await appController.getUsers();
      console.log(users);

      expect(Array.isArray(users)).toBe(true);

      expect(users.length).toBeGreaterThanOrEqual(0);

      if (users.length > 0) {
        expect(users[0]).toHaveProperty('id');
        expect(users[0]).toHaveProperty('email');
      }
    });
  });
});
