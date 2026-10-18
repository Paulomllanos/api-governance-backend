import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateApiDto } from './dto/create-api.dto.js';
import { UpdateApiDto } from './dto/update-api.dto.js';

@Injectable()
export class ApisService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }


    async findAll() {
        const apis = await this.prisma.api.findMany({
            include: {
                versions: {
                    select: {
                        version: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return apis.map(mapApiWithVersions);
    }




    async create(data: CreateApiDto) {
        const name = data.name.trim();
        const owner = data.owner.trim();

        if (!name) {
            throw new BadRequestException(
                'El nombre de la API no puede estar vacío.',
            );
        }

        if (!owner) {
            throw new BadRequestException(
                'El propietario de la API es obligatorio.',
            );
        }

        return this.prisma.api.create({
            data: {
                name,
                description: data.description.trim(),
                owner,
                status: 'DRAFT',
            },
        });
    }





    async findOne(id: string) {
        const api = await this.prisma.api.findUnique({
            where: { id },
            include: {
                versions: {
                    select: {
                        version: true,
                    },
                },
            },
        });

        if (!api) {
            throw new NotFoundException(
                `No existe una API con el identificador ${id}`,
            );
        }

        return mapApiWithVersions(api);
    }


    async update(id: string, data: UpdateApiDto) {
        // Comprobamos que la API exista.
        await this.findOne(id);

        const updateData: {
            name?: string;
            description?: string | null;
            owner?: string;
        } = {};

        if (data.name !== undefined) {
            const name = data.name.trim();

            if (!name) {
                throw new BadRequestException(
                    'El nombre de la API no puede estar vacío.',
                );
            }

            updateData.name = name;
        }

        if (data.description !== undefined) {
            updateData.description =
                data.description.trim() || null;
        }

        if (Object.keys(updateData).length === 0) {
            throw new BadRequestException(
                'Debe proporcionar al menos un campo para actualizar.',
            );
        }

        if (data.owner !== undefined) {
            const owner = data.owner.trim();

            if (!owner) {
                throw new BadRequestException(
                    'El propietario de la API no puede estar vacío.',
                );
            }

            updateData.owner = owner;
        }

        return this.prisma.api.update({
            where: { id },
            data: updateData,
        });
    }

}


function compareSemanticVersions(
    a: string,
    b: string,
): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let index = 0; index < 3; index++) {
        const difference = aParts[index] - bParts[index];

        if (difference !== 0) {
            return difference;
        }
    }

    return 0;
}


function mapApiWithVersions<
    T extends { versions: { version: string }[] }
>(api: T) {
    const { versions, ...apiData } = api;

    const latestVersion = versions
        .map((item) => item.version)
        .sort((a, b) => compareSemanticVersions(b, a))[0] ?? null;

    return {
        ...apiData,
        versionCount: versions.length,
        latestVersion,
    };
}

