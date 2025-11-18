/**
 * File Upload Utilities
 * 
 * Handles file uploads to Supabase Storage for profile photos and resumes
 */

import { supabase } from '@/lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

/**
 * Upload a profile photo to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user ID (for folder organization)
 * @returns The public URL of the uploaded file
 */
export async function uploadProfilePhoto(
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit. Please upload a smaller image.');
    }

    // Generate unique filename
    // Path should be: {userId}/{timestamp}.{ext}
    // The bucket name is already specified in .from('profile-photos')
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload file
    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      path: fileName
    };
  } catch (error: any) {
    console.error('Error uploading profile photo:', error);
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload profile photo'
    };
  }
}

/**
 * Upload a resume to Supabase Storage
 * @param file - The resume file to upload
 * @param userId - The user ID (for folder organization)
 * @returns The URL of the uploaded file
 */
export async function uploadResume(
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a PDF or Word document.');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit. Please upload a smaller file.');
    }

    // Generate unique filename
    // Path should be: {userId}/{timestamp}.{ext}
    // The bucket name is already specified in .from('resumes')
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload file
    const { error } = await supabase.storage
      .from('resumes')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get signed URL (resumes are not public)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(fileName, 31536000); // 1 year expiry

    if (urlError) {
      throw urlError;
    }

    return {
      url: urlData.signedUrl,
      path: fileName
    };
  } catch (error: any) {
    console.error('Error uploading resume:', error);
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload resume'
    };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw error;
    }

    return {};
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return {
      error: error.message || 'Failed to delete file'
    };
  }
}

/**
 * Get a signed URL for a resume file
 * @param path - The file path in the resumes bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL
 */
export async function getResumeUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('resumes')
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error('Error getting resume URL:', error);
    throw error;
  }
}

