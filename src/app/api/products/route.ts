import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDatabaseService } from '@/lib/services/database';
import { ProductsConfig, ProductConfig } from '@/lib/types';

const db = getDatabaseService();

// GET all products from database
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    const products = activeOnly 
      ? await db.getActiveProducts()
      : await db.getProducts();

    return NextResponse.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('Error getting products:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// POST to create a new product or sync from config file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a request to sync from config file
    if (body.action === 'sync') {
      return await syncProductsFromConfig();
    }

    // Create single product
    const { name, url, description, isActive = true } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const product = await db.createProduct({
      name,
      url,
      description,
      isActive
    });

    return NextResponse.json({
      success: true,
      data: product
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating product:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// Sync products from config file
async function syncProductsFromConfig() {
  try {
    const configPath = join(process.cwd(), 'config', 'products.json');
    const configContent = await readFile(configPath, 'utf-8');
    const config: ProductsConfig = JSON.parse(configContent);

    if (!config.products || !Array.isArray(config.products)) {
      throw new Error('Invalid config file format');
    }

    const results = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const productConfig of config.products) {
      try {
        // Validate required fields
        if (!productConfig.name || !productConfig.url) {
          results.push({
            name: productConfig.name || 'Unknown',
            status: 'skipped',
            reason: 'Missing name or URL'
          });
          skippedCount++;
          continue;
        }

        // Validate URL
        try {
          new URL(productConfig.url);
        } catch {
          results.push({
            name: productConfig.name,
            status: 'skipped',
            reason: 'Invalid URL format'
          });
          skippedCount++;
          continue;
        }

        // Check if product already exists by URL
        const existingProduct = await db.findProductByUrl(productConfig.url);

        if (existingProduct) {
          // Update existing product
          const updatedProduct = await db.updateProduct(existingProduct.id, {
            name: productConfig.name,
            description: productConfig.description,
            isActive: true
          });

          results.push({
            name: productConfig.name,
            status: 'updated',
            productId: updatedProduct.id
          });
          updatedCount++;
        } else {
          // Create new product
          const newProduct = await db.createProduct({
            name: productConfig.name,
            url: productConfig.url,
            description: productConfig.description,
            isActive: true
          });

          results.push({
            name: productConfig.name,
            status: 'created',
            productId: newProduct.id
          });
          createdCount++;
        }

      } catch (error) {
        console.error(`Error processing product ${productConfig.name}:`, error);
        results.push({
          name: productConfig.name,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`,
      summary: {
        total: config.products.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: results.filter(r => r.status === 'error').length
      },
      results
    });

  } catch (error) {
    console.error('Error syncing products from config:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync products from config file'
    }, { status: 500 });
  }
}
