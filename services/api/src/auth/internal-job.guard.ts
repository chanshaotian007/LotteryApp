import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AppConfigService } from "../common/config.service";

@Injectable()
export class InternalJobGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers["x-job-secret"];
    if (!secret || secret !== this.config.jobSharedSecret) {
      throw new ForbiddenException("job secret is required");
    }
    return true;
  }
}
