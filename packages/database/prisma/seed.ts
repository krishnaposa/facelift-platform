import 'dotenv/config';
import { PrismaClient } from '../../../apps/web/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
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
    {
      name: 'Aesthetic Upgrades (Visual & Structural)',
      slug: 'aesthetic-upgrades',
      items: [
        {
          name: 'Paint and Color Palette',
          slug: 'paint-and-color-palette',
          description:
            'Apply fresh, modern paint colors to walls, trim, ceilings, and exterior siding.',
          unitLabel: 'project',
          optionsSchema: {
            scope: ['interior', 'exterior', 'both'],
            finish_level: ['standard', 'premium_prep'],
          },
        },
        {
          name: 'Lighting Fixtures',
          slug: 'lighting-fixtures',
          description:
            'Replace dated chandeliers, vanity lights, and ceiling fans with modern LED lighting to brighten spaces.',
          unitLabel: 'room',
          optionsSchema: {
            fixture_types: ['chandelier', 'vanity', 'ceiling_fan', 'recessed', 'mixed'],
            led_preference: ['all_led', 'partial_led'],
          },
        },
        {
          name: 'Hardware and Details',
          slug: 'hardware-and-details',
          description:
            'Replace cabinet knobs, handles, door handles, and outlet covers (e.g., screwless plates).',
          unitLabel: 'project',
          optionsSchema: {
            focus: ['cabinets', 'doors', 'outlets', 'full_home_refresh'],
            style: ['modern_matte_black', 'brushed_nickel', 'brass', 'mixed'],
          },
        },
        {
          name: 'Kitchen & Bathroom Refresh',
          slug: 'kitchen-bathroom-refresh',
          description:
            'Install new countertops (quartz/marble), update backsplashes, and replace faucets and showerheads.',
          unitLabel: 'project',
          optionsSchema: {
            rooms: ['kitchen', 'bathroom', 'both'],
            countertop_material: ['quartz', 'marble', 'granite', 'mixed'],
          },
        },
        {
          name: 'Flooring',
          slug: 'flooring',
          description:
            'Replace old carpet with hardwood, laminate, or vinyl plank flooring for a cleaner, modern look.',
          unitLabel: 'sq_ft_estimate',
          optionsSchema: {
            material: ['hardwood', 'laminate', 'vinyl_plank', 'tile', 'mixed'],
            scope: ['single_room', 'main_level', 'whole_home'],
          },
        },
        {
          name: 'Curb Appeal',
          slug: 'curb-appeal',
          description:
            'Repaint the front door, update house numbers, and install new exterior light fixtures.',
          unitLabel: 'project',
          optionsSchema: {
            focus: ['front_door', 'numbers_and_mailbox', 'exterior_lights', 'full_package'],
          },
        },
      ],
    },
    {
      name: 'Technological Upgrades (Convenience & Efficiency)',
      slug: 'technological-upgrades',
      items: [
        {
          name: 'Smart Lighting',
          slug: 'smart-lighting',
          description:
            'Install smart dimmers and switches that allow control via phone or voice.',
          unitLabel: 'switch',
          optionsSchema: {
            count: 'number',
            ecosystem: ['alexa', 'google_home', 'apple_homekit', 'agnostic'],
          },
        },
        {
          name: 'Smart Thermostat',
          slug: 'smart-thermostat',
          description:
            'Install a smart thermostat (e.g., Nest or Ecobee) to optimize energy use and control heating/cooling remotely.',
          unitLabel: 'unit',
          optionsSchema: {
            brand_preference: ['nest', 'ecobee', 'honeywell', 'no_preference'],
            zones: ['single', 'multi'],
          },
        },
        {
          name: 'Home Security',
          slug: 'home-security',
          description: 'Add smart doorbells, smart locks, and security cameras.',
          unitLabel: 'project',
          optionsSchema: {
            package: ['doorbell_only', 'locks_and_cameras', 'full_perimeter'],
          },
        },
        {
          name: 'Modern Electrical',
          slug: 'modern-electrical',
          description:
            'Upgrade outdated outlets to include USB ports, and increase safety with smart fire and smoke detectors.',
          unitLabel: 'project',
          optionsSchema: {
            focus: ['usb_outlets', 'gfci_update', 'smart_detectors', 'full_panel_review'],
          },
        },
        {
          name: 'Smart Shades',
          slug: 'smart-shades',
          description: 'Install motorized and automated window treatments.',
          unitLabel: 'window',
          optionsSchema: {
            count: 'number',
            control: ['remote', 'app', 'voice', 'mixed'],
          },
        },
      ],
    },
    {
      name: 'Energy Efficiency Upgrades',
      slug: 'energy-efficiency',
      items: [
        {
          name: 'Insulation & Windows',
          slug: 'insulation-windows',
          description:
            'Enhance home insulation and replace old windows with energy-efficient models to reduce utility bills.',
          unitLabel: 'project',
          optionsSchema: {
            priority: ['insulation_first', 'windows_first', 'combined'],
            window_tier: ['double_pane', 'triple_pane', 'no_preference'],
          },
        },
        {
          name: 'Energy-Efficient Appliances',
          slug: 'energy-efficient-appliances',
          description:
            'Replace worn, inefficient appliances with sleek, energy-efficient models.',
          unitLabel: 'appliance',
          optionsSchema: {
            count: 'number',
            categories: ['kitchen', 'laundry', 'both'],
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
      passwordHash: null,
    },
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'testhomeowner@example.com',
      role: 'HOMEOWNER',
      passwordHash: null,
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
    await pool.end();
  });