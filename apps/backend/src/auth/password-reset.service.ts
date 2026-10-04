import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  async request(email: string) {
    const user = await this.prisma.client.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true, email: true },
    });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const hash = createHash('sha256').update(token).digest('hex');
      const now = new Date();
      const updated = await this.prisma.client.user.updateMany({
        where: {
          id: user.id,
          OR: [ { passwordResetSentAt: null }, { passwordResetSentAt: { lt: new Date(now.getTime() - 60000) } } ],
        },
        data: { passwordResetHash: hash, passwordResetExpiresAt: new Date(now.getTime() + 30 * 60000), passwordResetSentAt: now },
      });
      if (updated.count) {
        // Return the same response without waiting for SMTP, including for unknown accounts.
        void this.mail.sendPasswordReset(user.email, token).catch(async () => {
          this.logger.error('Password reset email delivery failed');
          try {
            await this.prisma.client.user.updateMany({
              where: { id: user.id, passwordResetHash: hash },
              data: { passwordResetHash: null, passwordResetExpiresAt: null, passwordResetSentAt: null },
            });
          } catch { this.logger.error('Could not clear failed password reset request'); }
        });
      }
    }
    return { message: 'Se esiste un account con questa email, riceverai un link per reimpostare la password. Controlla anche la posta indesiderata.' };
  }

  async reset(token: string, password: string) {
    const hash = createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.client.user.findUnique({ where: { passwordResetHash: hash } });
    const invalid = () => new BadRequestException('Link non valido o scaduto. Richiedi una nuova email.');
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date()) throw invalid();
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.client.$transaction(async tx => {
      const consumed = await tx.user.updateMany({
        where: { id: user.id, passwordResetHash: hash, passwordResetExpiresAt: { gt: new Date() } },
        data: { password: hashedPassword, passwordVersion: { increment: 1 }, passwordResetHash: null, passwordResetExpiresAt: null },
      });
      if (consumed.count !== 1) throw invalid();
      await tx.session.deleteMany({ where: { userId: user.id } });
    });
    return { message: 'Password aggiornata. Accedi con la nuova password.' };
  }
}
