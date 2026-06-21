import { db } from './index';
import { users, tasks } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('[SEED] Starting database seeding process...');

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskbridge.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    
    // 1. Check if admin exists
    const existingAdmins = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmins.length > 0) {
      console.log('[SEED] Admin user already exists. Skipping admin creation.');
      return;
    }

    // 2. Hash admin password
    const salt = await bcrypt.genSalt(12);
    const adminHash = await bcrypt.hash(adminPassword, salt);

    // 3. Insert Admin User
    const [adminUser] = await db
      .insert(users)
      .values({
        phone: process.env.ADMIN_PHONE || '01700000000',
        email: adminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
        name: 'System Administrator',
        isActive: true,
      })
      .returning();

    console.log(`[SEED] Created Admin account: ${adminEmail}`);

    // 4. Create sample Poster
    const posterHash = await bcrypt.hash('PosterPassword123!', salt);
    const [posterUser] = await db
      .insert(users)
      .values({
        phone: '01911112222',
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
    const seekerHash = await bcrypt.hash('SeekerPassword123!', salt);
    const [seekerUser] = await db
      .insert(users)
      .values({
        phone: '01811112222',
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
