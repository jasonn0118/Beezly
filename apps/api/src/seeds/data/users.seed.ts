import { DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import { createHash } from 'crypto';

export async function seedUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  // Check if users already exist
  const existingUsers = await userRepository.count();
  if (existingUsers > 0) {
    console.log('  ⏭️  Users already seeded, skipping...');
    return;
  }

  // Default password for all seed users (should be changed in production)
  // Note: This is just for seeding, real auth should use proper password hashing
  const defaultPassword = 'password123';
  const hashedPassword = createHash('sha256')
    .update(defaultPassword)
    .digest('hex');

  const users = [
    {
      email: 'admin@beezly.com',
      passwordHash: hashedPassword,
      displayName: 'Admin User',
    },
    {
      email: 'john.doe@example.com',
      passwordHash: hashedPassword,
      displayName: 'John Doe',
    },
    {
      email: 'jane.smith@example.com',
      passwordHash: hashedPassword,
      displayName: 'Jane Smith',
    },
    {
      email: 'test.user@example.com',
      passwordHash: hashedPassword,
      displayName: 'Test User',
    },
  ];

  const createdUsers = await userRepository.save(users);
  console.log(`  ✅ Created ${createdUsers.length} users`);
}
