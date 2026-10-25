
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const roles = [
  {
    name: 'ADMIN',
    description:
      'Administrador de la plataforma de gobierno de APIs.',
  },
  {
    name: 'REVIEWER',
    description:
      'Responsable de revisar y aprobar solicitudes.',
  },
  {
    name: 'DEVELOPER',
    description:
      'Responsable de registrar y mantener contratos de APIs.',
  },
];

async function main(): Promise<void> {
  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        description: role.description,
      },
      create: role,
    });

    console.log(`Rol sincronizado: ${role.name}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('Error al registrar los roles:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
