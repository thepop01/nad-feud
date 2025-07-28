# User Data Changes - Implementation Summary

This document outlines the changes made to convert "Question Data" to "User Data" in the admin panel.

## Changes Made

### 1. **Navigation & UI Updates**
- **Sidebar Navigation**: Changed "Question Data" to "User Data"
- **Page Header**: Updated from "Question Data - All Answers & Questions" to "User Data"
- **Counter Badge**: Now shows user count instead of answer count

### 2. **Backend Functions**

#### **New Supabase Function**: `getUserData()`
**Location**: `services/supabase.ts`
- Returns user statistics with aggregated data
- Includes fallback logic for manual queries if RPC function doesn't exist
- **Fields returned**:
  - `user_id`: User's unique identifier
  - `username`: Display name
  - `discord_id`: Discord user ID
  - `discord_role`: User's role (Admin, Full Access, etc.)
  - `total_score`: User's accumulated score
  - `questions_answered`: Count of questions the user has answered

#### **Mock Implementation**: `getUserData()`
**Location**: `services/mockSupabase.ts`
- Mirrors real implementation for testing
- Calculates answer counts from mock data
- Sorts users by score (descending)

### 3. **Database Function**
**File**: `database/add_user_data_function.sql`

#### **SQL Function**: `get_user_data()`
```sql
CREATE OR REPLACE FUNCTION get_user_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
```

**Features**:
- Aggregates user data with answer counts
- Orders by total score (descending), then username
- Returns JSON array of user objects
- Handles users with no answers (shows 0 count)

### 4. **Frontend Changes**

#### **New State Variables**
**Location**: `pages/AdminPage.tsx`
```typescript
// User data state
const [userData, setUserData] = useState<{
  user_id: string;
  username: string;
  discord_id: string;
  discord_role: string | null;
  total_score: number;
  questions_answered: number;
}[]>([]);

// User-specific filters
const [userSearchTerm, setUserSearchTerm] = useState('');
const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'Admin' | 'Full Access' | 'NADSOG' | 'Mon' | 'Nads'>('all');
```

#### **New Table Structure**
**Columns**:
1. **Username** - User's display name
2. **Discord ID** - User's Discord identifier
3. **Role** - User's role with color coding
4. **Total Score** - User's accumulated points (bold, large text)
5. **Questions Answered** - Count of questions answered

#### **Filtering & Search**
- **Search**: Username and Discord ID
- **Role Filter**: Filter by user roles
- **Clear Filters**: Reset all filters

#### **Export Functionality**
**Function**: `exportUserDataToCSV()`
- Exports filtered user data to CSV
- Filename: `user-data-YYYY-MM-DD.csv`
- **CSV Headers**: Username, Discord ID, Role, Total Score, Questions Answered

### 5. **Data Flow**
1. **Fetch**: `supaclient.getUserData()` called in `fetchData()`
2. **Filter**: Users filtered by search term and role
3. **Display**: Filtered users shown in table
4. **Export**: CSV export of filtered data

## SQL Migration Required

**⚠️ IMPORTANT**: You need to run the SQL migration to create the database function.

### **Steps to Apply**:
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the content from `database/add_user_data_function.sql`
4. Click **Run** to execute the migration

### **Alternative**: Manual SQL Execution
If you have direct database access:
```bash
psql -h your-supabase-host -U postgres -d postgres -f database/add_user_data_function.sql
```

## Features

### **User Data Table**
- **Responsive Design**: Works on mobile and desktop
- **Role Color Coding**: Different colors for each role
- **Score Highlighting**: Total scores displayed prominently
- **Sortable**: Users ordered by score (highest first)

### **Search & Filtering**
- **Real-time Search**: Filter as you type
- **Role-based Filtering**: Show users by specific roles
- **Clear Filters**: One-click filter reset

### **Export Capabilities**
- **CSV Export**: Download filtered user data
- **Date-stamped Files**: Automatic filename with current date
- **Complete Data**: All visible columns included

## Benefits

1. **Better User Management**: Focus on user statistics rather than individual answers
2. **Performance Insights**: See who's most active and highest scoring
3. **Role Analysis**: Filter and analyze users by their roles
4. **Data Export**: Easy export for external analysis
5. **Clean Interface**: Simplified view focused on user metrics

## Backward Compatibility

- **Old Question Data**: Still available in the codebase if needed
- **Existing Functions**: All previous functionality preserved
- **Gradual Migration**: Can be reverted if necessary

## Testing

The implementation includes:
- **Mock Data Support**: Works with mock backend for development
- **Error Handling**: Graceful fallbacks if database functions fail
- **Loading States**: Proper loading indicators
- **Empty States**: Handles cases with no user data

## Next Steps

After running the SQL migration, the User Data section will be fully functional with:
- Real-time user statistics
- Advanced filtering and search
- CSV export capabilities
- Responsive design across all devices
