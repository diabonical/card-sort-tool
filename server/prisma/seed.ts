import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.researcher.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin', 12);
    await prisma.researcher.create({
      data: { username: 'admin', passwordHash },
    });
    console.log('Created admin user (admin/admin)');
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
