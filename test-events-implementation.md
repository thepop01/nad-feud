# Events/Tasks Implementation Test Guide

## Overview
This document outlines how to test the newly implemented Events/Tasks feature.

## What Was Implemented

### 1. Database Schema
- Created `database/create_events_tasks_table.sql` with complete table structure
- Includes RLS policies for admin-only management and public read access
- Table fields: id, name, description, media_type, media_url, link_url, status, display_order, etc.

### 2. Type Definitions
- Added `EventTask` interface to `types.ts`
- Supports image, video, and GIF media types
- Live/ended status management

### 3. Backend Services
- Added comprehensive CRUD operations to `services/supabase.ts`:
  - `getEventsTasks()` - Get live events for homepage
  - `getAllEventsTasks()` - Get all events for admin panel
  - `createEventTask()` - Create new event/task
  - `updateEventTask()` - Update existing event/task
  - `deleteEventTask()` - Delete event/task
  - `uploadEventTaskMedia()` - Handle media uploads

### 4. Homepage Integration
- **UPDATED**: Created separate "Ongoing Events" panel (not a tab)
- Uses same color theme as Featured Highlights (indigo-purple-pink gradient)
- Positioned between Featured Highlights and Community Questions sections
- Only shows when live events exist
- Uses live data from database (not mock data)

### 5. Carousel Component
- Created `components/EventTaskCarousel.tsx`
- Single-slide display without overlay (as requested)
- Auto-play functionality with 5-second intervals
- Navigation controls (previous/next buttons)
- Supports images, videos, and GIFs
- Smooth transitions using Framer Motion
- Click-to-open link functionality

### 6. Admin Panel
- Created `components/EventTaskManager.tsx` with full CRUD interface
- Added "Events & Tasks" section to admin sidebar navigation
- Features:
  - Create new events/tasks with media upload
  - Edit existing events/tasks
  - Delete events/tasks with confirmation
  - Toggle live/ended status
  - Display order management
  - Media preview functionality
  - Link management

## Testing Steps

### 1. Homepage Testing
1. Navigate to the homepage
2. Look for separate "Ongoing Events" panel between Featured Highlights and Community Questions
3. If no live events exist, the panel should not appear
4. If live events exist, should show:
   - "Ongoing Events" title with indigo-purple-pink gradient (same as Featured Highlights)
   - Single-slide carousel with navigation controls
   - Auto-play functionality (5-second intervals)
5. Verify only two tabs in Community Questions: "Live Questions" and "Ended Questions"

### 2. Admin Panel Testing (Requires Admin Access)
1. Navigate to admin panel
2. Look for "Events & Tasks" section in sidebar
3. Click "Manage Events/Tasks"
4. Test creating a new event:
   - Fill in name, description, link URL
   - Upload an image or video
   - Set status (live/ended)
   - Set display order
   - Submit form
5. Test editing an existing event
6. Test deleting an event
7. Test toggling live/ended status

### 3. Database Migration
To create the events_tasks table, run the SQL from `database/create_events_tasks_table.sql` in your Supabase SQL editor.

## Expected Behavior

### Homepage
- **UPDATED**: Separate "Ongoing Events" panel (not a tab)
- Panel only appears when live events exist
- Uses same styling as Featured Highlights (indigo-purple-pink gradient)
- Two-tab navigation for questions: Live and Ended
- Carousel displays one slide at a time
- Auto-play advances slides every 5 seconds
- Navigation buttons allow manual control
- Clicking event opens link in new tab (if link provided)

### Admin Panel
- Clean interface for managing events/tasks
- Media upload with preview functionality
- Form validation and error handling
- Real-time updates after CRUD operations
- Status indicators and action buttons

## Potential Issues to Check

1. **Database Table**: Ensure events_tasks table exists
2. **RLS Policies**: Verify admin can create/edit, public can read
3. **Media Upload**: Check file upload functionality works
4. **Responsive Design**: Test on different screen sizes
5. **Error Handling**: Test with network issues or invalid data

## Files Modified/Created

### New Files:
- `database/create_events_tasks_table.sql`
- `components/EventTaskCarousel.tsx`
- `components/EventTaskManager.tsx`

### Modified Files:
- `types.ts` - Added EventTask interface
- `services/supabase.ts` - Added events/tasks CRUD operations
- `pages/HomePage.tsx` - Added events tab and carousel integration
- `pages/AdminPage.tsx` - Added events/tasks admin section

## Next Steps

1. Run database migration to create the table
2. Test the implementation thoroughly
3. Create some sample events/tasks to verify carousel functionality
4. Ensure proper error handling and user experience
5. Consider adding additional features like:
   - Event/task categories
   - Scheduled publishing
   - Analytics tracking
   - Bulk operations

The implementation is complete and ready for testing!
