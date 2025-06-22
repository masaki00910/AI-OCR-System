import { Injectable, NotFoundException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog, AuditOperation } from '../entities/audit-log.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ImportUsersDto, ImportUsersResponseDto, ImportUserError } from './dto/import-users.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: UserRole,
    isActive?: boolean,
  ): Promise<{ users: User[]; total: number }> {
    this.logger.log(`=== UsersService.findAll START ===`);
    this.logger.log(`TenantId: ${tenantId}, Page: ${page}, Limit: ${limit}`);

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.tenantId = :tenantId', { tenantId });

    // Search filter
    if (search) {
      query.andWhere(
        '(user.email ILIKE :search OR user.username ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Role filter
    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    // Active status filter
    if (isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive });
    }

    // Pagination
    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    // Order by created date (newest first)
    query.orderBy('user.createdAt', 'DESC');

    const [users, total] = await query.getManyAndCount();

    this.logger.log(`Found ${users.length} users out of ${total} total`);
    return { users, total };
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    this.logger.log(`=== UsersService.findOne START ===`);
    this.logger.log(`UserId: ${id}, TenantId: ${tenantId}`);

    const user = await this.userRepository.findOne({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(
    createUserDto: CreateUserDto,
    adminUserId: string,
    tenantId: string,
  ): Promise<User> {
    this.logger.log(`=== UsersService.create START ===`);
    this.logger.log(`DTO: ${JSON.stringify(createUserDto, null, 2)}`);
    this.logger.log(`AdminUserId: ${adminUserId}, TenantId: ${tenantId}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: createUserDto.email, tenantId },
        { username: createUserDto.username, tenantId },
      ],
    });

    if (existingUser) {
      if (existingUser.email === createUserDto.email) {
        throw new ConflictException('User with this email already exists');
      }
      if (existingUser.username === createUserDto.username) {
        throw new ConflictException('User with this username already exists');
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      passwordHash: hashedPassword,
      role: createUserDto.role || UserRole.VIEWER,
      isActive: createUserDto.isActive !== undefined ? createUserDto.isActive : true,
      tenantId,
    });

    const savedUser = await this.userRepository.save(user);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      adminUserId,
      'users',
      savedUser.id,
      AuditOperation.INSERT,
      null,
      { ...savedUser, passwordHash: '[HIDDEN]' },
    );

    this.logger.log(`User created successfully with ID: ${savedUser.id}`);
    return savedUser;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    adminUserId: string,
    tenantId: string,
  ): Promise<User> {
    this.logger.log(`=== UsersService.update START ===`);
    this.logger.log(`UserId: ${id}, DTO: ${JSON.stringify(updateUserDto, null, 2)}`);
    this.logger.log(`AdminUserId: ${adminUserId}, TenantId: ${tenantId}`);

    const user = await this.findOne(id, tenantId);
    const oldValues = { ...user, passwordHash: '[HIDDEN]' };

    // Check for conflicts if email or username is being changed
    if (updateUserDto.email || updateUserDto.username) {
      const conflicts = await this.userRepository
        .createQueryBuilder('user')
        .where('user.tenantId = :tenantId', { tenantId })
        .andWhere('user.id != :id', { id })
        .andWhere(
          '(user.email = :email OR user.username = :username)',
          {
            email: updateUserDto.email || '',
            username: updateUserDto.username || '',
          }
        )
        .getOne();

      if (conflicts) {
        if (conflicts.email === updateUserDto.email) {
          throw new ConflictException('User with this email already exists');
        }
        if (conflicts.username === updateUserDto.username) {
          throw new ConflictException('User with this username already exists');
        }
      }
    }

    // Update user
    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      adminUserId,
      'users',
      savedUser.id,
      AuditOperation.UPDATE,
      oldValues,
      { ...savedUser, passwordHash: '[HIDDEN]' },
    );

    this.logger.log(`User updated successfully`);
    return savedUser;
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangeUserPasswordDto,
    adminUserId: string,
    tenantId: string,
  ): Promise<void> {
    this.logger.log(`=== UsersService.changePassword START ===`);
    this.logger.log(`UserId: ${id}, AdminUserId: ${adminUserId}, TenantId: ${tenantId}`);

    const user = await this.findOne(id, tenantId);

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    // Update password
    user.passwordHash = hashedPassword;
    await this.userRepository.save(user);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      adminUserId,
      'users',
      user.id,
      AuditOperation.UPDATE,
      { action: 'password_change' },
      { action: 'password_changed' },
    );

    this.logger.log(`Password changed successfully for user: ${id}`);
  }

  async remove(id: string, adminUserId: string, tenantId: string): Promise<void> {
    this.logger.log(`=== UsersService.remove START ===`);
    this.logger.log(`UserId: ${id}, AdminUserId: ${adminUserId}, TenantId: ${tenantId}`);

    const user = await this.findOne(id, tenantId);
    const oldValues = { ...user, passwordHash: '[HIDDEN]' };

    await this.userRepository.remove(user);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      adminUserId,
      'users',
      id,
      AuditOperation.DELETE,
      oldValues,
      null,
    );

    this.logger.log(`User deleted successfully`);
  }

  async invite(
    inviteUserDto: InviteUserDto,
    adminUserId: string,
    tenantId: string,
  ): Promise<{ inviteToken: string; expiresAt: Date }> {
    this.logger.log(`=== UsersService.invite START ===`);
    this.logger.log(`DTO: ${JSON.stringify(inviteUserDto, null, 2)}`);
    this.logger.log(`AdminUserId: ${adminUserId}, TenantId: ${tenantId}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: inviteUserDto.email, tenantId },
        { username: inviteUserDto.username, tenantId },
      ],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Generate invite token (simplified - in production use JWT)
    const inviteToken = Buffer.from(
      JSON.stringify({
        email: inviteUserDto.email,
        username: inviteUserDto.username,
        role: inviteUserDto.role,
        tenantId,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // TODO: Send email with invite link
    // await this.emailService.sendInviteEmail(inviteUserDto.email, inviteToken, inviteUserDto.message);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      adminUserId,
      'users',
      null,
      AuditOperation.INSERT,
      null,
      { action: 'user_invited', email: inviteUserDto.email },
    );

    this.logger.log(`Invite sent successfully to: ${inviteUserDto.email}`);
    return { inviteToken, expiresAt };
  }

  async importUsers(
    importUsersDto: ImportUsersDto,
    adminUserId: string,
    tenantId: string,
  ): Promise<ImportUsersResponseDto> {
    this.logger.log(`=== UsersService.importUsers START ===`);
    this.logger.log(`Importing ${importUsersDto.users.length} users`);
    this.logger.log(`AdminUserId: ${adminUserId}, TenantId: ${tenantId}`);

    const response: ImportUsersResponseDto = {
      total: importUsersDto.users.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < importUsersDto.users.length; i++) {
      const userDto = importUsersDto.users[i];
      const rowNumber = i + 1;

      try {
        await this.create(userDto, adminUserId, tenantId);
        response.success++;
      } catch (error) {
        response.failed++;
        response.errors.push({
          row: rowNumber,
          email: userDto.email,
          username: userDto.username,
          error: error.message,
        });
        
        this.logger.warn(`Failed to import user at row ${rowNumber}: ${error.message}`);
      }
    }

    // Create audit log for import operation
    await this.createAuditLog(
      tenantId,
      adminUserId,
      'users',
      null,
      AuditOperation.INSERT,
      null,
      {
        action: 'bulk_import',
        total: response.total,
        success: response.success,
        failed: response.failed,
      },
    );

    this.logger.log(`Import completed. Success: ${response.success}, Failed: ${response.failed}`);
    return response;
  }

  async toggleActive(
    id: string,
    adminUserId: string,
    tenantId: string,
  ): Promise<User> {
    this.logger.log(`=== UsersService.toggleActive START ===`);
    this.logger.log(`UserId: ${id}, AdminUserId: ${adminUserId}, TenantId: ${tenantId}`);

    const user = await this.findOne(id, tenantId);
    const oldValues = { ...user, passwordHash: '[HIDDEN]' };

    user.isActive = !user.isActive;
    const savedUser = await this.userRepository.save(user);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      adminUserId,
      'users',
      savedUser.id,
      AuditOperation.UPDATE,
      oldValues,
      { ...savedUser, passwordHash: '[HIDDEN]' },
    );

    this.logger.log(`User active status toggled. New status: ${savedUser.isActive}`);
    return savedUser;
  }

  private async createAuditLog(
    tenantId: string,
    userId: string | null,
    tableName: string,
    recordId: string | null,
    operation: AuditOperation,
    oldValues: any,
    newValues: any,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        tenantId,
        userId,
        tableName,
        recordId: recordId || 'bulk_operation',
        operation,
        oldValues,
        newValues,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      // Don't throw error for audit log failures
    }
  }
}