// OPTIONAL: Real-time updates using Supabase subscriptions
// Add this to CommunityHighlightsPage.tsx if you want live updates

useEffect(() => {
  // Subscribe to changes in community_highlights table
  const subscription = supabase
    .channel('community_highlights_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'community_highlights'
      },
      (payload) => {
        console.log('Community highlights changed:', payload);
        
        // Refresh highlights when data changes
        fetchDailyHighlights();
        fetchWeeklyHighlights();
      }
    )
    .subscribe();

  // Cleanup subscription on unmount
  return () => {
    subscription.unsubscribe();
  };
}, []);

// OPTIONAL: Auto-refresh every 5 minutes
useEffect(() => {
  const interval = setInterval(() => {
    fetchDailyHighlights();
    fetchWeeklyHighlights();
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
}, []);
