import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { AuditLog, AuditOperation } from '../entities/audit-log.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string, tenantName: string): Promise<User | null> {
    // Find tenant
    const tenant = await this.tenantRepository.findOne({
      where: { name: tenantName, isActive: true },
    });

    if (!tenant) {
      this.logger.warn(`Login attempt for non-existent tenant: ${tenantName}`);
      return null;
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: {
        email,
        tenantId: tenant.id,
        isActive: true,
      },
      relations: ['tenant'],
    });

    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${email} in tenant: ${tenantName}`);
      return null;
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email} in tenant: ${tenantName}`);
      return null;
    }

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Audit log
    await this.createAuditLog(user, 'login');

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password, tenantName } = loginDto;
    
    const user = await this.validateUser(email, password, tenantName);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, username, password, tenantName, role = UserRole.VIEWER } = registerDto;

    // Find tenant
    const tenant = await this.tenantRepository.findOne({
      where: { name: tenantName, isActive: true },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid tenant');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { email, tenantId: tenant.id },
        { username, tenantId: tenant.id },
      ],
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = this.userRepository.create({
      email,
      username,
      passwordHash,
      role,
      tenantId: tenant.id,
      isActive: true,
    });

    await this.userRepository.save(user);

    // Load tenant relation
    user.tenant = tenant;

    // Audit log
    await this.createAuditLog(user, 'register');

    // Generate token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantName: tenant.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant.name,
      },
    };
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        id: payload.sub,
        isActive: true,
      },
      relations: ['tenant'],
    });

    if (!user || !user.tenant.isActive) {
      return null;
    }

    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update password
    await this.userRepository.update(userId, { passwordHash });

    // Audit log
    await this.createAuditLog(user, 'password_change');
  }

  private async createAuditLog(user: User, action: string): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      tenantId: user.tenantId,
      userId: user.id,
      tableName: 'users',
      recordId: user.id,
      operation: AuditOperation.UPDATE,
      newValues: { action, timestamp: new Date() },
    });

    await this.auditLogRepository.save(auditLog);
  }
}