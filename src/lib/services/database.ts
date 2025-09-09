import { PrismaClient, DeviceType, JobStatus, Prisma } from '@prisma/client';
import { 
  Product, 
  PerformanceMeasurement, 
  MeasurementJob, 
  PerformanceMetrics,
  ProductPerformanceData,
  DateRange 
} from '../types';

class DatabaseService {
  private prisma: any;
  private isConnected = false;
  private connectionError: string | null = null;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    try {
      console.log('🏗️ Creating new DatabaseService singleton instance...');
      console.log('🔍 DATABASE_URL check:', {
        exists: !!process.env.DATABASE_URL,
        value: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        isFile: process.env.DATABASE_URL?.includes('file:') || false
      });

      // Store in global for hot reload persistence in development
      if (process.env.NODE_ENV === 'development') {
        // @ts-ignore
        (global as any).__databaseService = this;
      }
      
      if (process.env.DATABASE_URL) {
        console.log('🔌 Initializing Prisma client...');
        this.prisma = new PrismaClient({
          log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
          datasources: {
            db: {
              url: process.env.DATABASE_URL
            }
          },
          errorFormat: 'pretty'
        });

        // Graceful disconnect on process exit
        process.on('beforeExit', async () => {
          console.log('🔌 Gracefully disconnecting Prisma on process exit...');
          await this.prisma?.$disconnect();
        });

        // Start connection asynchronously
        this.connectionPromise = this.testConnection();
      } else {
        console.log('🎭 No DATABASE_URL found, using demo mode');
        this.isConnected = false;
        this.connectionError = 'No DATABASE_URL configured - using demo data';
        this.prisma = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      console.error('❌ Database initialization failed:', errorMessage);
      this.isConnected = false;
      this.connectionError = errorMessage;
      this.prisma = null;
    }
  }

  private async testConnection() {
    try {
      if (!process.env.DATABASE_URL) {
        console.log('🎭 No DATABASE_URL found, using demo mode');
        this.isConnected = false;
        this.connectionError = 'No DATABASE_URL configured - using demo data';
        return;
      }

      console.log('🔗 Testing PostgreSQL database connection...');
      
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          if (retryCount > 0) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⏳ Retry attempt ${retryCount}/${maxRetries} after ${delay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Ensure clean connection
          await this.prisma.$disconnect().catch(() => {});

          // Set connection timeout
          const connectionTimeout = setTimeout(() => {
            throw new Error('PostgreSQL connection timeout after 15 seconds');
          }, 15000);

          await this.prisma.$connect();
          clearTimeout(connectionTimeout);

          // Test with a simple query
          await this.prisma.$queryRaw`SELECT 1 as test, NOW() as timestamp`;
          
          console.log('✅ PostgreSQL database connected successfully');
          this.isConnected = true;
          this.connectionError = null;
          return;
          
        } catch (retryError: any) {
          retryCount++;
          console.warn(`❌ Connection attempt ${retryCount} failed:`, retryError.message);
          
          if (retryCount >= maxRetries) {
            throw retryError;
          }
        }
      }
    } catch (connectionError: any) {
      const errorMessage = connectionError instanceof Error ? connectionError.message : 'Unknown database error';
      
      let enhancedError = `PostgreSQL connection failed: ${errorMessage}`;
      
      // Add specific error context
      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        enhancedError += ' (Database may be sleeping - this is normal for serverless databases)';
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
        enhancedError += ' (Check DATABASE_URL and network connectivity)';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('password')) {
        enhancedError += ' (Check database credentials)';
      } else if (errorMessage.includes('Response from the Engine was empty')) {
        enhancedError += ' (Prisma engine connection issue - database may be cold starting)';
      }

      console.error('❌ Final database connection failure:', enhancedError);
      this.isConnected = false;
      this.connectionError = enhancedError;
      
      throw new Error(enhancedError);
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.connectionPromise) {
      console.log('⏳ Waiting for existing connection promise...');
      await this.connectionPromise;
      this.connectionPromise = null;
    }
    
    if (!this.isConnected && this.prisma) {
      console.log('🔄 Connection not active, attempting to reconnect...');
      this.connectionPromise = this.testConnection();
      await this.connectionPromise;
      this.connectionPromise = null;
    }
  }

  private throwIfNotConnected() {
    if (!this.isConnected) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Production database not configured. Please set up DATABASE_URL environment variable with PostgreSQL connection string. Current error: ${this.connectionError}`);
      }
      throw new Error(`Database connection failed: ${this.connectionError || 'Unknown error'}`);
    }
  }

  // Production demo data when database is not available
  private getProductionDemoProducts(): Product[] {
    return [
      // Blum Theme
      { id: '1', name: 'Blum - Solie', url: 'https://blum-solie.myshopify.com/', description: 'Blum theme - Solie variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', name: 'Blum - Celia', url: 'https://blum-celia.myshopify.com/', description: 'Blum theme - Celia variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '3', name: 'Blum - Mondo', url: 'https://blum-mondo.myshopify.com/', description: 'Blum theme - Mondo variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '4', name: 'Blum - Crafts', url: 'https://blum-crafts.myshopify.com/', description: 'Blum theme - Crafts variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '5', name: 'Blum - Fuji', url: 'https://blum-fuji.myshopify.com/', description: 'Blum theme - Fuji variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      // Electro Theme
      { id: '6', name: 'Electro - Gizmo', url: 'https://electro-gizmo-demo.myshopify.com/', description: 'Electro theme - Gizmo variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '7', name: 'Electro - Audio', url: 'https://electro-audio-demo.myshopify.com/', description: 'Electro theme - Audio variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '8', name: 'Electro - Surveillance', url: 'https://electro-surveillance-demo.myshopify.com/', description: 'Electro theme - Surveillance variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '9', name: 'Electro - Skatewear', url: 'https://electro-skatewear.myshopify.com/', description: 'Electro theme - Skatewear variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      // Shine Theme
      { id: '10', name: 'Shine - Sophisticated', url: 'https://shine-sophisticated.myshopify.com/', description: 'Shine theme - Sophisticated variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '11', name: 'Shine - Energetic', url: 'https://shine-energetic.myshopify.com/', description: 'Shine theme - Energetic variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '12', name: 'Shine - Serene', url: 'https://shine-serene.myshopify.com/', description: 'Shine theme - Serene variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      // Normcore Theme
      { id: '13', name: 'Normcore - Elementary', url: 'https://normcore-elementary.myshopify.com/', description: 'Normcore theme - Elementary variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '14', name: 'Normcore - Fundamental', url: 'https://normcore-fundamental.myshopify.com/', description: 'Normcore theme - Fundamental variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '15', name: 'Normcore - Subtle', url: 'https://normcore-subtle.myshopify.com/', description: 'Normcore theme - Subtle variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '16', name: 'Normcore - Matte', url: 'https://normcore-matte.myshopify.com/', description: 'Normcore theme - Matte variant', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '17', name: 'Normcore - Raw', url: 'https://normcore-raw.myshopify.com/', description: 'Normcore theme - Raw variant', isActive: true, createdAt: new Date(), updatedAt: new Date() }
    ];
  }

  // Database operations - all require connection

  // Product operations - with production demo fallback
  async getProducts(): Promise<Product[]> {
    try {
      await this.ensureConnection();
      
      if (!this.isConnected || !this.prisma) {
        console.log('🎭 Using demo data (database not available)');
        return this.getProductionDemoProducts();
      }
      
      const products = await this.prisma.product.findMany({
        orderBy: { name: 'asc' }
      });
      console.log('✅ Retrieved', products.length, 'products from database');
      return products;
    } catch (error) {
      console.warn('⚠️ getProducts failed, falling back to demo data:', error);
      return this.getProductionDemoProducts();
    }
  }

  async getActiveProducts(): Promise<Product[]> {
    if (!this.isConnected || !this.prisma) {
      console.log('🎭 Using demo data (database not available)');
      return this.getProductionDemoProducts().filter(p => p.isActive);
    }
    
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    console.log('✅ Retrieved', products.length, 'active products from database');
    return products;
  }

  async getProductById(id: string): Promise<Product | null> {
    if (!this.isConnected || !this.prisma) {
      console.log('🎭 Using demo data for getProductById (database not available)');
      const demoProducts = this.getProductionDemoProducts();
      return demoProducts.find(p => p.id === id) || null;
    }
    
    return await this.prisma.product.findUnique({
      where: { id }
    });
  }

  async createProduct(data: {
    name: string;
    url: string;
    description?: string;
    isActive?: boolean;
  }): Promise<Product> {
    this.throwIfNotConnected();
    
    const product = await this.prisma.product.create({ data });
    console.log('✅ Product created in database:', product.name);
    return product;
  }

  async findProductByUrl(url: string): Promise<Product | null> {
    this.throwIfNotConnected();
    
    return await this.prisma.product.findFirst({
      where: { url }
    });
  }

  // Performance measurement operations - require database connection
  async createMeasurement(data: {
    productId: string;
    deviceType: DeviceType;
    performanceScore: number;
    fcp?: number | null;
    lcp?: number | null;
    cls?: number | null;
    fid?: number | null;
    ttfb?: number | null;
    speedIndex?: number | null;
    tbt?: number | null;
    opportunity?: Prisma.JsonValue | null;
    diagnostics?: Prisma.JsonValue | null;
    measurementDate?: Date;
  }): Promise<PerformanceMeasurement> {
    if (!this.isConnected || !this.prisma) {
      console.log('🎭 Creating demo measurement (database not available)');
      
      // Get product for demo measurement - use demo data directly instead of trying to query DB
      let product;
      
      try {
        // Find product in demo data
        const demoProducts = this.getProductionDemoProducts();
        product = demoProducts.find(p => p.id === data.productId);
        
        if (!product) {
          // If not found, use first product as fallback
          console.warn(`⚠️ Product ID ${data.productId} not found in demo data, using first product as fallback`);
          product = demoProducts[0];
        }
      } catch (error) {
        console.error('Error finding demo product:', error);
        throw new Error(`Failed to find product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Create a demo measurement object
      const demoMeasurement: PerformanceMeasurement = {
        id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: product.id, // Use ID of found product or fallback
        deviceType: data.deviceType,
        performanceScore: data.performanceScore,
        fcp: data.fcp || null,
        lcp: data.lcp || null,
        cls: data.cls || null,
        fid: data.fid || null,
        ttfb: data.ttfb || null,
        speedIndex: data.speedIndex || null,
        tbt: data.tbt || null,
        opportunity: data.opportunity || null,
        diagnostics: data.diagnostics || null,
        measurementDate: data.measurementDate || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        product: product
      };

      console.log('✅ Demo measurement created:', {
        id: demoMeasurement.id,
        score: data.performanceScore,
        fcp: data.fcp,
        lcp: data.lcp,
        deviceType: data.deviceType,
        productName: product.name
      });

      return demoMeasurement;
    }
    
    try {
      // First verify that the product exists to prevent foreign key constraint violation
      const product = await this.prisma.product.findUnique({
        where: { id: data.productId }
      });
      
      if (!product) {
        console.warn(`⚠️ Product with ID ${data.productId} not found in database. Attempting to find by URL...`);
        
        // Try to find product by URL from demo data
        const demoProducts = this.getProductionDemoProducts();
        const matchingProduct = demoProducts.find(p => p.id === data.productId);
        
        if (matchingProduct) {
          // If found in demo data, try to create product in database
          console.log(`💡 Found matching product in demo data, creating in database: ${matchingProduct.name}`);
          
          try {
            // Create new product in database based on demo data
            const newProduct = await this.prisma.product.create({
              data: {
                name: matchingProduct.name,
                url: matchingProduct.url,
                description: matchingProduct.description || '',
                isActive: matchingProduct.isActive
              }
            });
            
            console.log(`✅ Created missing product in database: ${newProduct.name} (ID: ${newProduct.id})`);
            
            // Update productId to use new ID
            data.productId = newProduct.id;
          } catch (createError) {
            console.error(`❌ Failed to create product in database:`, createError);
            throw new Error(`Product with ID ${data.productId} not found and failed to create it: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
          }
        } else {
          throw new Error(`Product with ID ${data.productId} not found. Cannot create measurement for non-existent product.`);
        }
      }
      
      const measurementData = {
        ...data,
        measurementDate: data.measurementDate || new Date()
      };

      const measurement = await this.prisma.performanceMeasurement.create({
        data: measurementData,
        include: { product: true }
      });
      
      console.log('✅ Measurement saved to database:', {
        id: measurement.id,
        score: data.performanceScore,
        fcp: data.fcp,
        lcp: data.lcp,
        deviceType: data.deviceType,
        productName: measurement.product?.name
      });
      
      return measurement;
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('Product with ID'))) {
        console.error('Error in createMeasurement:', error);
      }
      throw error;
    }
  }

  async getMeasurements(options: {
    productId?: string;
    deviceType?: DeviceType;
    dateRange?: DateRange;
    limit?: number;
    offset?: number;
  } = {}): Promise<PerformanceMeasurement[]> {
    if (!this.isConnected || !this.prisma) {
      console.log('🎭 Using demo measurements (database not available)');
      // Return empty array for demo - measurements need real API calls
      return [];
    }
    
    const { productId, deviceType, dateRange, limit, offset } = options;
    const measurements = await this.prisma.performanceMeasurement.findMany({
      where: {
        ...(productId && { productId }),
        ...(deviceType && { deviceType }),
        ...(dateRange && {
          measurementDate: {
            gte: dateRange.from,
            lte: dateRange.to
          }
        })
      },
      include: { product: true },
      orderBy: { measurementDate: 'desc' },
      ...(limit && { take: limit }),
      ...(offset && { skip: offset })
    });
    
    console.log('✅ Retrieved', measurements.length, 'measurements from database');
    return measurements;
  }

  async getLatestMeasurements(productId: string): Promise<{
    desktop?: PerformanceMeasurement;
    mobile?: PerformanceMeasurement;
  }> {
    this.throwIfNotConnected();
    
    const [desktop, mobile] = await Promise.all([
      this.prisma.performanceMeasurement.findFirst({
        where: { productId, deviceType: DeviceType.DESKTOP },
        orderBy: { measurementDate: 'desc' },
        include: { product: true }
      }),
      this.prisma.performanceMeasurement.findFirst({
        where: { productId, deviceType: DeviceType.MOBILE },
        orderBy: { measurementDate: 'desc' },
        include: { product: true }
      })
    ]);
    
    return { desktop, mobile };
  }

  // Additional database operations

  async healthCheck(): Promise<boolean> {
    try {
      // Ensure connection is established
      await this.ensureConnection();
      
      if (!this.isConnected || !this.prisma) {
        console.warn('⚠️ Health check failed: Database not connected');
        return false;
      }

      // Test with a simple query with timeout
      const healthCheckPromise = this.prisma.$queryRaw`SELECT 1 as health_check, NOW() as timestamp`;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout after 10 seconds')), 10000);
      });

      await Promise.race([healthCheckPromise, timeoutPromise]);
      console.log('✅ Database health check passed');
      return true;
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Response from the Engine was empty')) {
        console.warn('⚠️ Health check failed: Prisma engine connection issue (database may be cold starting)');
      } else if (errorMessage.includes('timeout')) {
        console.warn('⚠️ Health check failed: Database query timeout');
      } else {
        console.warn('⚠️ Health check failed:', errorMessage);
      }
      
      // Mark as disconnected if health check fails
      this.isConnected = false;
      this.connectionError = errorMessage;
      
      return false;
    }
  }

  async reconnect(): Promise<boolean> {
    try {
      console.log('🔄 Attempting to reconnect to database...');
      
      if (this.prisma) {
        await this.prisma.$disconnect().catch(() => {});
      }
      
      this.isConnected = false;
      this.connectionError = null;
      this.connectionPromise = this.testConnection();
      await this.connectionPromise;
      this.connectionPromise = null;
      
      return this.isConnected;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Reconnection failed:', errorMessage);
      this.connectionError = errorMessage;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  // Add method to get connection status and error details
  getConnectionStatus(): { isConnected: boolean; error: string | null } {
    return {
      isConnected: this.isConnected,
      error: this.connectionError
    };
  }

  async updateProduct(id: string, data: any): Promise<Product> {
    this.throwIfNotConnected();
    return await this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(id: string): Promise<void> {
    this.throwIfNotConnected();
    await this.prisma.product.delete({ where: { id } });
    console.log('✅ Product deleted from database:', id);
  }

  async getTotalMeasurements(): Promise<number> {
    this.throwIfNotConnected();
    return await this.prisma.performanceMeasurement.count();
  }

  async getLastUpdated(): Promise<Date | null> {
    this.throwIfNotConnected();
    const latest = await this.prisma.performanceMeasurement.findFirst({
      orderBy: { measurementDate: 'desc' },
      select: { measurementDate: true }
    });
    return latest?.measurementDate || null;
  }

  // Stub methods for compatibility
  async getAverageScores(productId: string, days: number = 30) {
    this.throwIfNotConnected();
    
    const measurements = await this.prisma.performanceMeasurement.findMany({
      where: { 
        productId,
        measurementDate: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    const desktopScores = measurements.filter((m: any) => m.deviceType === DeviceType.DESKTOP).map((m: any) => m.performanceScore);
    const mobileScores = measurements.filter((m: any) => m.deviceType === DeviceType.MOBILE).map((m: any) => m.performanceScore);
    
    const desktop = desktopScores.length > 0 ? Math.round(desktopScores.reduce((a: number, b: number) => a + b, 0) / desktopScores.length) : 0;
    const mobile = mobileScores.length > 0 ? Math.round(mobileScores.reduce((a: number, b: number) => a + b, 0) / mobileScores.length) : 0;
    
    return { desktop, mobile };
  }

  async getProductPerformanceData(): Promise<ProductPerformanceData[]> {
    const products = await this.getActiveProducts();
    const performanceData = await Promise.all(
      products.map(async (product) => {
        const [latestMeasurements, averageScores, measurements] = await Promise.all([
          this.getLatestMeasurements(product.id),
          this.getAverageScores(product.id),
          this.getMeasurements({ productId: product.id, limit: 30 })
        ]);
        return {
          product,
          latestDesktop: latestMeasurements.desktop,
          latestMobile: latestMeasurements.mobile,
          measurements,
          averageScore: averageScores
        };
      })
    );
    return performanceData;
  }

  // Configuration methods
  async getConfig(key: string): Promise<string | null> {
    // Check if database is connected before attempting to access it
    if (!this.isConnected || !this.prisma) {
      console.log('⚠️ Database not connected, returning null for config:', key);
      return null;
    }
    
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key }
      });
      return config?.value || null;
    } catch (error) {
      console.error('Error getting config:', error);
      return null;
    }
  }

  async setConfig(key: string, value: string): Promise<void> {
    // Check if database is connected before attempting to access it
    if (!this.isConnected || !this.prisma) {
      console.log('⚠️ Database not connected, cannot save config:', key);
      return;
    }
    
    try {
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
      console.log('✅ Config saved to database:', key);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }
  async getMeasurementStats(dateRange?: DateRange) {
    this.throwIfNotConnected();
    
    const where = dateRange ? {
      measurementDate: {
        gte: dateRange.from,
        lte: dateRange.to
      }
    } : {};
    
    const [total, deviceBreakdown] = await Promise.all([
      this.prisma.performanceMeasurement.count({ where }),
      this.prisma.performanceMeasurement.groupBy({
        by: ['deviceType'],
        where,
        _count: true,
        _avg: { performanceScore: true }
      })
    ]);
    
    const averageScores = {
      desktop: deviceBreakdown.find((d: any) => d.deviceType === DeviceType.DESKTOP)?._avg.performanceScore || 0,
      mobile: deviceBreakdown.find((d: any) => d.deviceType === DeviceType.MOBILE)?._avg.performanceScore || 0
    };
    
    return {
      total,
      averageScores,
      deviceBreakdown
    };
  }
}

// Global singleton instance with development hot-reload support
let databaseService: DatabaseService | null = null;

// Support hot reload in development
if (typeof global !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-ignore - Global variable for development hot reload
  if ((global as any).__databaseService) {
    databaseService = (global as any).__databaseService;
    console.log('♻️ Reusing existing DatabaseService from hot reload');
  }
}

export function getDatabaseService(): DatabaseService {
  if (!databaseService) {
    databaseService = new DatabaseService();
    
    // Store in global for hot reload persistence in development
    if (typeof global !== 'undefined' && process.env.NODE_ENV === 'development') {
      (global as any).__databaseService = databaseService;
    }
  }
  return databaseService;
}

export function resetDatabaseService(): void {
  if (databaseService) {
    databaseService.disconnect();
    databaseService = null;
  }
}