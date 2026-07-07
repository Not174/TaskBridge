import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db, isDatabaseConfigured } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Configure Cloudinary only if the environment variables are provided
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { image } = await req.json(); // base64 string e.g. "data:image/png;base64,..."

    if (!image) {
      return NextResponse.json({ error: 'No image data provided.' }, { status: 400 });
    }

    let imageUrl = '';

    // 1. If Cloudinary is configured, upload to Cloudinary
    if (isCloudinaryConfigured) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: 'taskbridge_avatars',
        });
        imageUrl = uploadResponse.secure_url;
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed, falling back to base64:', cloudinaryError);
        imageUrl = image; // fallback to storing base64
      }
    } 
    // 2. If Cloudinary is not configured, save base64 string directly
    else {
      console.log('[Upload Route] Cloudinary is not configured. Saving image as base64 string in DB.');
      imageUrl = image;
    }

    if (!isDatabaseConfigured() || !db) {
      return NextResponse.json({
        success: true,
        message: 'Profile picture upload skipped because the database is not configured.',
        imageUrl,
      });
    }

    // 3. Update database record for the user
    await db
      .update(users)
      .set({ profilePicUrl: imageUrl })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: 'Profile picture uploaded successfully.',
      imageUrl,
    });
  } catch (error: any) {
    console.error('Error in upload-image API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
