// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { ADMIN } from 'src/app.constants';
// import { Context } from 'telegraf';

// @Injectable()
// export class AdminGuard implements CanActivate {
//   private readonly ADMIN_ID = ADMIN; // Admin ID ni configdan oling

//   canActivate(context: ExecutionContext): boolean {
//     const ctx = context.switchToRpc().getContext<Context>();

//     // Admin bo‘lmaganlar uchun taqiqlash
//     return ctx.from?.id === this.ADMIN_ID;
//   }
// }
