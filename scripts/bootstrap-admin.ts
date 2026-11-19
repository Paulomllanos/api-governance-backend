
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  const displayName =
    process.env.BOOTSTRAP_ADMIN_NAME?.trim();

  const password =
    process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (
    !email ||
    !displayName ||
    !password ||
    password.length < 12 ||
    password.length > 128
  ) {
    throw new Error(
      'Configura correo, nombre y contraseña ' +
      'de 12 a 128 caracteres para el administrador.',
    );
  }

  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  if (!adminRole) {
    throw new Error(
      'Primero debes ejecutar el seed de roles.',
    );
  }

  const existingAdmin = await prisma.userRole.findFirst({
    where: {
      roleId: adminRole.id,
    },
  });

  if (existingAdmin) {
    throw new Error(
      'Ya existe una asignación ADMIN. ' +
      'No se creará otra cuenta de inicialización.',
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error(
      'El correo ya está registrado.',
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      roles: {
        create: {
          role: {
            connect: {
              id: adminRole.id,
            },
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  });

  console.log('Administrador creado:', user.email);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
