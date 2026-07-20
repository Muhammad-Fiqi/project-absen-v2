# Student Data Import Script

This script imports student data from `Student.csv` into the Turso database.

## Usage

To import student data:

```bash
bun run import:students
```

## What it does

1. Reads the `Student.csv` file from the project root
2. Parses all student records (expects CSV with headers matching database schema)
3. For each record:
   - Deletes any existing student with the same `studentCode` (handles duplicates/updates)
   - Inserts the new student record
4. Reports the total number of unique students in the database after import

## Features

- **Idempotent**: Can be run multiple times safely
- **Duplicate handling**: Uses `studentCode` as unique identifier to update existing records
- **Progress reporting**: Shows progress during processing
- **Verification**: Reports final count of unique students in database

## Database Schema Mapping

The script maps CSV columns to the `Student` table as follows:

| CSV Column | Database Column | Type | Notes |
|------------|----------------|------|-------|
| id | id | TEXT | Primary key |
| studentCode | studentCode | TEXT | Unique, not null |
| name | name | TEXT | Not null |
| email | email | TEXT | Nullable |
| phone | phone | TEXT | Nullable |
| courseCode | courseCode | TEXT | Not null |
| courseId | courseId | TEXT | Nullable |
| pinHash | pinHash | TEXT |  |
| sessionQuota | sessionQuota | INTEGER | Default 15 |
| quotaExtendedAt | quotaExtendedAt | TEXT | Nullable |
| quotaNote | quotaNote | TEXT | Nullable |
| createdAt | createdAt | TEXT | Not null, defaults to current timestamp |

## Requirements

- Bun runtime
- Environment variables set in `.env`:
  - `DATABASE_TURSO_DATABASE_URL`
  - `DATABASE_TURSO_AUTH_TOKEN`

## Example Output

```
Starting student import from Student.csv...
Parsed 179 records from CSV
Processing records...
Successfully processed 179 student records!
Total unique students in database: 172
```