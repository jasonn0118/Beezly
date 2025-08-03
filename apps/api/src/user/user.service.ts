import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileDTO } from '../../../packages/types/dto/user';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsers(): Promise<UserProfileDTO[]> {
    const users = await this.userRepository.find({
      relations: ['receipts'],
    });

    return users.map((user) => this.mapUserToDTO(user));
  }

  async getUserById(id: string): Promise<UserProfileDTO | null> {
    // Try to find by userSk (UUID) first, then by id (integer)
    let user = await this.userRepository.findOne({
      where: { userSk: id },
      relations: ['receipts'],
    });

    // If not found by userSk, try by integer id
    if (!user && !isNaN(Number(id))) {
      user = await this.userRepository.findOne({
        where: { id: Number(id) },
        relations: ['receipts'],
      });
    }

    return user ? this.mapUserToDTO(user) : null;
  }

  async getUserByEmail(email: string): Promise<UserProfileDTO | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['receipts'],
    });

    return user ? this.mapUserToDTO(user) : null;
  }

  async createUser(userData: Partial<UserProfileDTO>): Promise<UserProfileDTO> {
    // Parse displayName into firstName and lastName
    const { firstName, lastName } = this.parseDisplayName(userData.displayName);

    const user = this.userRepository.create({
      email: userData.email,
      passwordHash: '', // This should be handled by auth service
      firstName: userData.firstName,
      lastName: userData.lastName,
      points: userData.pointBalance || 0,
      level: userData.level,
    });

    const savedUser = await this.userRepository.save(user);
    return this.mapUserToDTO(savedUser);
  }

  async createUserWithSupabaseId(
    supabaseId: string,
    userData: Partial<UserProfileDTO>,
  ): Promise<UserProfileDTO> {
    const user = this.userRepository.create({
      userSk: supabaseId, // Use Supabase ID as userSk
      email: userData.email,
      passwordHash: '', // Supabase handles authentication
      firstName: userData.firstName,
      lastName: userData.lastName,
      points: userData.pointBalance || 0,
      level: userData.level,
    });

    const savedUser = await this.userRepository.save(user);
    return this.mapUserToDTO(savedUser);
  }

  async updateUser(
    id: string,
    userData: Partial<UserProfileDTO>,
  ): Promise<UserProfileDTO> {
    const user = await this.getUserEntityById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update fields
    if (userData.email) user.email = userData.email;
    if (userData.firstName !== undefined) user.firstName = userData.firstName;
    if (userData.lastName !== undefined) user.lastName = userData.lastName;
    if (userData.pointBalance !== undefined)
      user.points = userData.pointBalance;
    if (userData.level !== undefined) user.level = userData.level;

    const updatedUser = await this.userRepository.save(user);
    return this.mapUserToDTO(updatedUser);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserEntityById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.remove(user);
  }

  async updateUserPoints(
    userSk: string,
    pointsDelta: number,
  ): Promise<UserProfileDTO> {
    const user = await this.userRepository.findOne({
      where: { userSk },
    });

    if (!user) {
      throw new NotFoundException(`User with userSk ${userSk} not found`);
    }

    user.points += pointsDelta;
    const updatedUser = await this.userRepository.save(user);
    return this.mapUserToDTO(updatedUser);
  }

  private async getUserEntityById(id: string): Promise<User | null> {
    // Try to find by userSk (UUID) first, then by id (integer)
    let user = await this.userRepository.findOne({
      where: { userSk: id },
    });

    // If not found by userSk, try by integer id
    if (!user && !isNaN(Number(id))) {
      user = await this.userRepository.findOne({
        where: { id: Number(id) },
      });
    }

    return user;
  }

  private parseDisplayName(displayName?: string): {
    firstName?: string;
    lastName?: string;
  } {
    if (!displayName?.trim()) {
      return { firstName: undefined, lastName: undefined };
    }

    const nameParts = displayName.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: undefined };
    } else if (nameParts.length >= 2) {
      return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
      };
    }

    return { firstName: undefined, lastName: undefined };
  }

  private mapUserToDTO(user: User): UserProfileDTO {
    return {
      id: user.userSk, // Use UUID as the public ID
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      pointBalance: user.points,
      level: user.level,
      rank: undefined, // Not implemented in new schema
      badges: [], // This would come from UserBadges relationship
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
