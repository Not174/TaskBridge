import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import bcrypt from 'bcryptjs';

async function seed() {
  console.log('[SEED] Starting database seeding process...');

  try {
    // Dynamically import db and schema after environment variables are loaded
    const { db } = await import('./index');
    const { users, tasks } = await import('./schema');
    const { eq } = await import('drizzle-orm');
    const { generateUserUniqueId } = await import('../auth/id');

    // 0. Clean database
    console.log('[SEED] Cleaning existing database records...');
    await db.delete(tasks);
    await db.delete(users);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskbridge.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

    // 2. Hash admin password
    const salt = await bcrypt.genSalt(12);
    const adminHash = await bcrypt.hash(adminPassword, salt);

    // 3. Insert Admin User
    const adminPhone = process.env.ADMIN_PHONE || '01700000000';
    const [adminUser] = await db
      .insert(users)
      .values({
        id: generateUserUniqueId(adminPhone, 'ADMIN'),
        phone: adminPhone,
        email: adminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
        name: 'System Administrator',
        isActive: true,
      })
      .returning();

    console.log(`[SEED] Created Admin account: ${adminEmail}`);

    // 4. Create sample Poster
    const posterPhone = '01911112222';
    const posterHash = await bcrypt.hash('PosterPassword123!', salt);
    const [posterUser] = await db
      .insert(users)
      .values({
        id: generateUserUniqueId(posterPhone, 'POSTER'),
        phone: posterPhone,
        email: 'poster@taskbridge.com',
        passwordHash: posterHash,
        role: 'POSTER',
        name: 'Adnan Rahman',
        location: 'Dhanmondi, Dhaka',
        isActive: true,
      })
      .returning();
      
    console.log('[SEED] Created sample Poster account: 01911112222');

    // 5. Create sample Seeker
    const seekerPhone = '01811112222';
    const seekerHash = await bcrypt.hash('SeekerPassword123!', salt);
    const [seekerUser] = await db
      .insert(users)
      .values({
        id: generateUserUniqueId(seekerPhone, 'SEEKER'),
        phone: seekerPhone,
        email: 'seeker@taskbridge.com',
        passwordHash: seekerHash,
        role: 'SEEKER',
        name: 'Kamrul Hasan',
        location: 'Mirpur, Dhaka',
        houseAddress: 'House 14, Road 2, Mirpur 10, Dhaka',
        isActive: true,
      })
      .returning();
      
    console.log('[SEED] Created sample Seeker account: 01811112222');

    // 5.1. Create Demo Poster
    const demoPosterPhone = '01572906305';
    const demoPosterHash = await bcrypt.hash('PosterPassword123!', salt);
    const [demoPosterUser] = await db
      .insert(users)
      .values({
        id: generateUserUniqueId(demoPosterPhone, 'POSTER'),
        phone: demoPosterPhone,
        email: 'demoposter@taskbridge.com',
        passwordHash: demoPosterHash,
        role: 'POSTER',
        name: 'Demo Client',
        location: 'Gulshan, Dhaka',
        isActive: true,
      })
      .returning();
    console.log('[SEED] Created demo Poster account: 01572906305');

    // 5.2. Create Demo Seeker
    const demoSeekerPhone = '01754553400';
    const demoSeekerHash = await bcrypt.hash('SeekerPassword123!', salt);
    const [demoSeekerUser] = await db
      .insert(users)
      .values({
        id: generateUserUniqueId(demoSeekerPhone, 'SEEKER'),
        phone: demoSeekerPhone,
        email: 'demoseeker@taskbridge.com',
        passwordHash: demoSeekerHash,
        role: 'SEEKER',
        name: 'Demo Tech Seeker',
        location: 'Banani, Dhaka',
        houseAddress: 'House 5, Road 11, Banani, Dhaka',
        isActive: true,
      })
      .returning();
    console.log('[SEED] Created demo Seeker account: 01754553400');

    // 6. Create sample Tasks
    // Task 1: Open
    await db.insert(tasks).values({
      posterId: posterUser.id,
      title: 'Clean 3-Bedroom Apartment',
      category: 'Cleaning',
      description: 'Need a thorough cleaning of a 3-bedroom apartment. Vacuuming, dusting, kitchen and bathroom cleaning. All cleaning materials will be provided.',
      location: 'Dhanmondi, Dhaka',
      budget: 1500,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'OPEN',
    });

    // Task 2: In Progress (assigned to seeker)
    await db.insert(tasks).values({
      posterId: posterUser.id,
      seekerId: seekerUser.id,
      title: 'Deliver Documents to Gulshan',
      category: 'Delivery & Courier',
      description: 'Deliver urgent business documents from Dhanmondi to Gulshan 2. Immediate delivery needed.',
      location: 'Dhanmondi to Gulshan, Dhaka',
      budget: 500,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
    });

    // Task 3: Completed (assigned to seeker)
    await db.insert(tasks).values({
      posterId: posterUser.id,
      seekerId: seekerUser.id,
      title: 'Fix AC Leaking Issue',
      category: 'Appliance Repair',
      description: 'Split AC is leaking water in the living room. Need a technician to inspect and fix the leak.',
      location: 'Dhanmondi, Dhaka',
      budget: 1200,
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // past deadline
      status: 'COMPLETED',
    });

    // Task 4: Completed Demo Task (Poster: 01572906305, Seeker: 01754553400)
    await db.insert(tasks).values({
      id: '#DEMO1',
      posterId: demoPosterUser.id,
      seekerId: demoSeekerUser.id,
      title: 'Office IT Setup & Networking',
      category: 'IT & Networking',
      description: 'Set up routers, switches, local network, and client configurations for a 15-workstation office.',
      location: 'Banani, Dhaka',
      budget: 4500,
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'COMPLETED',
      progressStep: 'FINISHED',
    });

    console.log('[SEED] Successfully seeded database with sample tasks.');
  } catch (error) {
    console.error('[SEED] Seeding error:', error);
  }
}

// Run the seed function
seed().then(() => {
  console.log('[SEED] Seeding script completed.');
  process.exit(0);
});
