import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.tenantId) {
      // This is executed before the route handler
      return next.handle().pipe(
        tap({
          next: async () => {
            try {
              // Set session context for Row Level Security
              await this.dataSource.query(
                'SELECT set_app_context($1::uuid, $2::uuid, $3::text)',
                [user.tenantId, user.id, user.role]
              );
            } catch (error) {
              console.error('Error setting tenant context:', error);
            }
          },
          complete: async () => {
            try {
              // Reset session context after request
              await this.dataSource.query('RESET app.tenant_id');
              await this.dataSource.query('RESET app.user_id');
              await this.dataSource.query('RESET app.user_role');
            } catch (error) {
              console.error('Error resetting tenant context:', error);
            }
          },
        }),
      );
    }

    return next.handle();
  }
}