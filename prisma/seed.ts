import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Read products from config file
    const configPath = path.join(process.cwd(), 'config', 'products.json');
    const productsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log(`📚 Found ${productsConfig.products.length} products in config file`);
    
    // Create products in database
    for (const product of productsConfig.products) {
      // Check if product already exists (by URL)
      const existingProduct = await prisma.product.findUnique({
        where: { url: product.url }
      });
      
      if (!existingProduct) {
        await prisma.product.create({
          data: {
            name: product.name,
            url: product.url,
            description: product.description,
            isActive: true
          }
        });
        console.log(`✅ Created product: ${product.name}`);
      } else {
        console.log(`⏭️ Product already exists: ${product.name}`);
      }
    }
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
