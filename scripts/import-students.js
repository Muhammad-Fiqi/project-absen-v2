import { db } from '../src/lib/db.js';
import { student } from '../src/db/schema.js';
import { eq, count as sqlCount } from 'drizzle-orm';
import fs from 'fs';
import { parse } from 'csv-parse';

// Function to import CSV data
async function importStudentsFromCSV() {
  try {
    console.log('Starting student import from Student.csv...');
    
    // Read and parse CSV file
    const records = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('./Student.csv')
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
        .on('data', (data) => {
          records.push(data);
        })
        .on('end', () => {
          console.log(`Parsed ${records.length} records from CSV`);
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    // Process records - delete existing and insert new (to handle duplicates properly)
    console.log('Processing records...');
    for (const record of records) {
      // Delete any existing record with this studentCode to handle duplicates
      await db.delete(student).where(eq(student.studentCode, record.studentCode));
      
      // Insert the new record
      await db.insert(student).values({
        id: record.id,
        studentCode: record.studentCode,
        name: record.name,
        email: record.email || null,
        phone: record.phone || null,
        courseCode: record.courseCode,
        courseId: record.courseId || null,
        pinHash: record.pinHash,
        sessionQuota: parseInt(record.sessionQuota) || 15,
        quotaExtendedAt: record.quotaExtendedAt || null,
        quotaNote: record.quotaNote || null,
        createdAt: record.createdAt || new Date().toISOString()
      });
    }
    
    console.log(`Successfully processed ${records.length} student records!`);
    
    // Verify the import
    const countResult = await db.select({ count: sqlCount() }).from(student);
    const count = Number(countResult[0].count);
    console.log(`Total unique students in database: ${count}`);
    
  } catch (error) {
    console.error('Error importing students:', error);
    process.exit(1);
  }
}

// Run the import
importStudentsFromCSV();