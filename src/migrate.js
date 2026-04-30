require('dotenv').config();
const db = require('./db');
const logger = require('./logger');

const migrate = async () => {
  try {
    logger.info('Running database migration for item-service...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        type VARCHAR(10) NOT NULL CHECK (type IN ('lost', 'found')),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        date TIMESTAMP DEFAULT NOW(),
        photo_url TEXT,
        status VARCHAR(20) DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'recovered')),
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id)');

    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Migration failed');
    process.exit(1);
  }
};

migrate();
