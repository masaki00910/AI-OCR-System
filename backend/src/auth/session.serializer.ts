import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }

  serializeUser(user: User, done: (err: Error | null, id?: any) => void): void {
    done(null, { id: user.id, tenantId: user.tenantId });
  }

  async deserializeUser(
    payload: { id: string; tenantId: string },
    done: (err: Error | null, payload?: any) => void,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: payload.id },
      relations: ['tenant'],
    });
    
    if (!user) {
      return done(new Error('User not found'));
    }
    
    done(null, user);
  }
}