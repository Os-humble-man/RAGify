import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function fixPgVector() {
   console.log('🔧 Starting pgvector fix...\n');

   try {
      // Step 1: Check if extension is active (skip creation if no superuser permissions)
      console.log('🔍 Step 1: Verifying pgvector extension...');
      const extensions = await prisma.$queryRawUnsafe(`
         SELECT * FROM pg_extension WHERE extname = 'vector';
      `);

      if (!Array.isArray(extensions) || extensions.length === 0) {
         console.log('⚠️  pgvector extension is not enabled!');
         console.log('📝 Please run this command on your server:');
         console.log(
            '   sudo -u postgres psql -d your_database -c "CREATE EXTENSION IF NOT EXISTS vector;"'
         );
         console.log('');
         throw new Error(
            'pgvector extension not found. Please enable it manually with superuser permissions.'
         );
      }

      console.log('✅ pgvector extension is active:', extensions);
      console.log('');

      // Step 2: Drop existing table with CASCADE
      console.log('🗑️  Step 2: Dropping existing docs_vectors table...');
      await prisma.$executeRawUnsafe(
         `DROP TABLE IF EXISTS "docs_vectors" CASCADE;`
      );
      console.log('✅ Table dropped\n');

      // Step 3: Recreate table with proper vector type
      console.log(
         '🏗️  Step 3: Creating docs_vectors table with vector type...'
      );
      await prisma.$executeRawUnsafe(`
         CREATE TABLE "docs_vectors" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "docId" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "chunkIndex" INTEGER NOT NULL,
            "content" TEXT NOT NULL,
            "metadata" JSONB,
            "embedding" vector(1536),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL
         );
      `);
      console.log('✅ Table created with vector type\n');

      // Step 4: Create indexes
      console.log('📊 Step 4: Creating indexes...');

      // Vector similarity index (using HNSW for better performance)
      await prisma.$executeRawUnsafe(`
         CREATE INDEX IF NOT EXISTS "docs_vectors_embedding_idx" 
         ON "docs_vectors" USING hnsw (embedding vector_cosine_ops);
      `);
      console.log('✅ Vector similarity index created');

      // Other useful indexes
      await prisma.$executeRawUnsafe(`
         CREATE INDEX IF NOT EXISTS "docs_vectors_docId_idx" 
         ON "docs_vectors"("docId");
      `);
      console.log('✅ docId index created');

      await prisma.$executeRawUnsafe(`
         CREATE INDEX IF NOT EXISTS "docs_vectors_title_idx" 
         ON "docs_vectors"("title");
      `);
      console.log('✅ title index created\n');

      // Step 5: Verify the setup
      console.log('✅ Step 5: Verifying setup...');
      const tableInfo = await prisma.$queryRawUnsafe(`
         SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = 'docs_vectors';
      `);
      console.log('Table structure:', tableInfo);
      console.log('');

      console.log('='.repeat(50));
      console.log('✅ pgvector setup completed successfully!');
      console.log('='.repeat(50));
      console.log('\n📝 Next steps:');
      console.log('   1. Run: bun run prepare-docs (to index your documents)');
      console.log('   2. Run: bun run test-rag (to test the RAG system)');
      console.log('');
   } catch (error) {
      console.error('\n❌ Error during pgvector setup:', error);
      throw error;
   } finally {
      await prisma.$disconnect();
   }
}

// Run the fix
if (require.main === module) {
   fixPgVector()
      .then(() => {
         console.log('🎉 Script completed!');
         process.exit(0);
      })
      .catch((error) => {
         console.error('💥 Script failed:', error);
         process.exit(1);
      });
}

export { fixPgVector };
