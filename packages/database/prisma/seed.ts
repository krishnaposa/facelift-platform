import 'dotenv/config';
import { PrismaClient } from '../../../apps/web/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = [
    {
      name: 'Exterior',
      slug: 'exterior',
      items: [
        {
          name: 'Front Door',
          slug: 'front-door',
          description: 'Replace or upgrade front entry doors',
          unitLabel: 'door',
          optionsSchema: {
            type: ['single', 'double', 'double_sidelights'],
          },
        },
      ],
    },
    {
      name: 'Bathroom',
      slug: 'bathroom',
      items: [
        {
          name: 'Bidets',
          slug: 'bidets',
          description: 'Add bidets to one or more toilets',
          unitLabel: 'toilet',
          optionsSchema: {
            count: 'number',
          },
        },
      ],
    },
    {
      name: 'Kitchen',
      slug: 'kitchen',
      items: [
        {
          name: 'Cabinet Refacing',
          slug: 'cabinet-refacing',
          description: 'Refresh cabinet surfaces and finishes',
          unitLabel: 'project',
          optionsSchema: {
            finish: ['painted', 'stained', 'laminate'],
          },
        },
        {
          name: 'Countertops',
          slug: 'countertops',
          description: 'Replace countertops with upgraded material',
          unitLabel: 'project',
          optionsSchema: {
            material: ['quartz', 'granite', 'marble', 'laminate'],
          },
        },
      ],
    },
    {
      name: 'Staircase',
      slug: 'staircase',
      items: [
        {
          name: 'Spindles and Railings',
          slug: 'spindles-and-railings',
          description: 'Replace staircase spindles and railing components',
          unitLabel: 'project',
          optionsSchema: {
            material: ['wood', 'iron', 'steel'],
          },
        },
      ],
    },
    {
      name: 'HVAC Aesthetics',
      slug: 'hvac-aesthetics',
      items: [
        {
          name: 'Air Vents',
          slug: 'air-vents',
          description: 'Replace vent covers and returns',
          unitLabel: 'vent',
          optionsSchema: {
            style: ['modern_white', 'black_metal', 'wood_flush'],
          },
        },
      ],
    },
  ];

  for (const category of categories) {
    const savedCategory = await prisma.catalogCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
      },
      create: {
        name: category.name,
        slug: category.slug,
      },
    });

    for (const item of category.items) {
      await prisma.catalogItem.upsert({
        where: { slug: item.slug },
        update: {
          name: item.name,
          description: item.description,
          unitLabel: item.unitLabel,
          optionsSchema: item.optionsSchema,
          active: true,
          categoryId: savedCategory.id,
        },
        create: {
          name: item.name,
          slug: item.slug,
          description: item.description,
          unitLabel: item.unitLabel,
          optionsSchema: item.optionsSchema,
          active: true,
          categoryId: savedCategory.id,
        },
      });
    }
  }

  await prisma.user.upsert({
    where: { email: 'testhomeowner@example.com' },
    update: {
      role: 'HOMEOWNER',
    },
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'testhomeowner@example.com',
      role: 'HOMEOWNER',
    },
  });

  console.log('Seed complete');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });