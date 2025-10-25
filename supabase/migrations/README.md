# Database Migrations

## Complete Schema File

This directory contains a single consolidated migration file that includes the entire database schema for Yuzen AI Flow.

### File: `00000000000000_complete_schema.sql`

This is the **complete database schema** containing all tables, functions, triggers, policies, and views for the entire application.

## What's Included

### 1. **Core Tables**
- `profiles` - User profiles with roles (admin, manager, hr, employee)
- `teams` - Team management
- `team_members` - Team membership (many-to-many)

### 2. **Project Management**
- `projects` - Project information
- `project_teams` - Multi-team project assignment (many-to-many)
- `tasks` - Task management with Kanban support
- `project_discussions` - Real-time project discussions
- `project_documents` - Document management per project

### 3. **Enhanced Attendance System**
- `office_settings` - Configurable office hours, geofencing
- `attendance` - Check-in/out with geolocation, timezone, work hours, overtime
- `attendance_breaks` - Break tracking (lunch, coffee, custom)
- `attendance_qr_codes` - QR code generation for attendance
- `attendance_notifications` - Attendance reminders and alerts
- `attendance_summary` (VIEW) - Reporting and analytics

### 4. **Leave Management**
- `leave_requests` - Leave request and approval system

### 5. **Messaging System**
- `groups` - Group chat functionality
- `group_members` - Group membership
- `messages` - Group and direct messages

### 6. **File Management**
- `files` - File uploads and management

## Database Functions

### Attendance Functions
- `calculate_work_hours()` - Auto-calculate net work hours (gross hours - breaks)
- `calculate_overtime()` - Auto-calculate overtime based on office settings
- `auto_checkout_forgotten_users()` - Auto check-out users at end of day
- `generate_daily_qr_code()` - Generate secure daily QR codes

### Utility Functions
- `update_updated_at_column()` - Trigger function for auto-updating timestamps
- `handle_new_user()` - Auto-create profile on user signup

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:
- Users can view/update their own data
- Role-based access (admin, manager, hr, employee)
- Team-based access control
- Project-based access control

## Indexes

Performance indexes added for:
- `attendance(user_id, date)` - Fast attendance lookups
- `attendance(date)` - Date-based queries
- `attendance(status)` - Status filtering

## How to Apply This Migration

### Option 1: Fresh Supabase Project
If you're starting with a fresh Supabase project, simply run the entire SQL file in the Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `00000000000000_complete_schema.sql`
3. Paste and execute

### Option 2: Using Supabase CLI
```bash
# Initialize Supabase (if not already done)
npx supabase init

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

### Option 3: Manual Migration
If you have an existing database, you may need to:
1. Backup your existing data
2. Review conflicts between existing and new schema
3. Apply the migration incrementally or reset the database

## Important Notes

⚠️ **This is a complete schema reset** - Running this on an existing database will attempt to create all tables. Make sure to:
- Backup your data first
- Review for conflicts with existing schema
- Test in a development environment first

✅ **All features included**:
- Multi-team project assignment
- Task editing with Kanban
- Geolocation-based attendance
- Break tracking with live timer
- Work hours & overtime calculation
- QR code attendance
- Attendance history & export
- Real-time discussions
- Document management

## Schema Version

**Version**: 1.0.0 (Consolidated)
**Date**: October 25, 2025
**Status**: Production Ready

## Maintenance

This single file replaces all previous migration files. Any future changes should be added as new migration files with proper timestamps.
