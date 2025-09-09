import { redirect } from 'next/navigation';
import { getDatabaseService } from '@/lib/services/database';

export default async function Home() {
  // Pre-warm the database connection before redirecting
  try {
    const db = getDatabaseService();
    // This will trigger the connection initialization
    await db.getProducts();
  } catch (error) {
    console.log('Database pre-warming failed, but continuing with redirect:', error);
  }
  
  // Redirect to dashboard page
  redirect('/dashboard');
}