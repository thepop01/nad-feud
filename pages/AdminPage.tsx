
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { supaclient } from '../services/supabase';
import { Question, SuggestionWithUser, CategorizedSuggestionGroup, HighlightSuggestionWithUser, CommunityHighlight } from '../types';
import { PlusCircle, Trash2, Play, User as UserIcon, UploadCloud, X, StopCircle, Edit, AlertTriangle, Layers, List, Search, Download, Filter, Star, Image as ImageIcon, Twitter, ExternalLink, CheckCircle, Clock, Link, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CommunityHighlightsManager from '../components/CommunityHighlightsManager';
import TwitterPreview from '../components/TwitterPreview';
import BulkLinkManager from '../components/BulkLinkManager';
import LinkAnalytics from '../components/LinkAnalytics';

const AdminPage: React.FC = () => {
  const { isAdmin, user, isLoading } = useAuth();
  const [view, setView] = useState<'manage' | 'suggestions' | 'datasheet' | 'featured-highlights' | 'alltime-highlights' | 'highlight-suggestions' | 'bulk-links' | 'link-analytics'>('manage');
  
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionWithUser[]>([]);
  const [highlightSuggestions, setHighlightSuggestions] = useState<HighlightSuggestionWithUser[]>([]);
  const [allAnswers, setAllAnswers] = useState<{
    id: string;
    answer_text: string;
    created_at: string;
    question_id: string;
    question_text: string;
    question_status: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    discord_role: string | null;
  }[]>([]);
  
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [endingQuestionId, setEndingQuestionId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [manualAnswersModal, setManualAnswersModal] = useState<{ questionId: string; questionText: string } | null>(null);
  const [manualAnswers, setManualAnswers] = useState<{ group_text: string; percentage: number }[]>([
    { group_text: '', percentage: 0 },
    { group_text: '', percentage: 0 },
    { group_text: '', percentage: 0 },
    { group_text: '', percentage: 0 },
    { group_text: '', percentage: 0 },
    { group_text: '', percentage: 0 },
    { group_text: '', percentage: 0 },
    { group_text: '', percentage: 0 }
  ]);

  // Data sheet filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'ended' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Admin' | 'Full Access' | 'NADSOG' | 'Mon' | 'Nads'>('all');
  const [isDataLoading, setIsDataLoading] = useState(true);

  // State for editing questions
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState({ text: '', imageUrl: '' });
  
  // State for reset functionality
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [secondConfirmText, setSecondConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // State for suggestion categorization
  const [categorizedSuggestions, setCategorizedSuggestions] = useState<CategorizedSuggestionGroup[] | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [suggestionTab, setSuggestionTab] = useState<'questions' | 'highlights'>('questions');


  useEffect(() => {
    if (editingQuestion) {
      setEditForm({
        text: editingQuestion.question_text,
        imageUrl: editingQuestion.image_url || '',
      });
    }
  }, [editingQuestion]);

  const fetchData = useCallback(async () => {
    setIsDataLoading(true);
    try {
        const [pQuestions, suggs, liveQs, answers, highlightSuggs] = await Promise.all([
          supaclient.getPendingQuestions(),
          supaclient.getSuggestions(),
          supaclient.getLiveQuestions(),
          supaclient.getAllAnswersWithDetails(),
          supaclient.getHighlightSuggestions(),
        ]);
        setPendingQuestions(pQuestions);
        setSuggestions(suggs);
        setLiveQuestions(liveQs);
        setAllAnswers(answers);
        setHighlightSuggestions(highlightSuggs);
        setCategorizedSuggestions(null); // Reset categories on fresh data load
    } catch(error) {
        console.error("Failed to fetch admin data:", error);
        alert("Could not load admin data.");
    } finally {
        setIsDataLoading(false);
    }
  }, []);

  const convertToHighlight = async (suggestion: HighlightSuggestionWithUser) => {
    if (!user) return;

    try {
      const newHighlight: Omit<CommunityHighlight, 'id' | 'created_at'> = {
        title: suggestion.description || 'Community Highlight',
        description: suggestion.description || '',
        media_url: 'https://via.placeholder.com/400x300?text=Add+Media', // Placeholder image
        media_type: 'image' as const,
        embedded_link: suggestion.twitter_url,
        is_active: true,
        display_order: 0,
        uploaded_by: user.id,
        created_by: user.id,
        is_featured: false,
        updated_at: new Date().toISOString(),
        view_count: 0
      };

      await supaclient.createCommunityHighlight(newHighlight);
      await supaclient.deleteHighlightSuggestion(suggestion.id);

      alert('Highlight suggestion converted successfully! You can edit the media URL in the Featured Highlights tab.');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to convert suggestion to highlight:', error);
      alert(`Failed to convert suggestion to highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteHighlightSuggestion = async (suggestionId: string) => {
    if (!confirm('Are you sure you want to delete this highlight suggestion?')) return;

    try {
      await supaclient.deleteHighlightSuggestion(suggestionId);

      setHighlightSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      alert('Highlight suggestion deleted successfully!');
    } catch (error) {
      console.error('Failed to delete highlight suggestion:', error);
      alert('Failed to delete highlight suggestion');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  // Debug function to help troubleshoot auth issues
  const debugAuth = () => {
    console.log('🔍 Auth Debug Info:', {
      user: user,
      isAdmin: isAdmin,
      isLoading: isLoading,
      userId: user?.id,
      username: user?.username,
      userIsAdmin: user?.is_admin,
      timestamp: new Date().toISOString()
    });
    alert(`Auth Debug:\nUser: ${user?.username || 'None'}\nAdmin: ${isAdmin}\nLoading: ${isLoading}`);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setNewQuestionImage(''); // Clear URL input if file is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    const fileInput = document.getElementById('image-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !user) return;
    setIsSubmitting(true);
    
    try {
      let finalImageUrl: string | null = newQuestionImage || null;

      if (selectedFile) {
        // The user ID is needed for associating storage uploads securely.
        finalImageUrl = await supaclient.uploadQuestionImage(selectedFile, user.id);
      }

      await supaclient.createQuestion(newQuestionText, finalImageUrl);
      
      setNewQuestionText('');
      setNewQuestionImage('');
      removeImage();
      fetchData();
    } catch (error: any) {
      console.error("Failed to create question:", error);
      alert(`Failed to create question: ${error.message || 'Please check console for details.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartQuestion = async (id: string) => {
    await supaclient.startQuestion(id);
    alert('Question is now live!');
    fetchData();
  };
  
  const handleEndQuestion = async (id: string) => {
    if (endingQuestionId) return;
    setEndingQuestionId(id);
    try {
        await supaclient.endQuestion(id);
        await fetchData();
    } catch (error) {
        console.error("Failed to end question:", error);
        alert("An error occurred while ending the question. Please check the console for details.");
    } finally {
        setEndingQuestionId(null);
    }
  };

  const handleDeleteLiveQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this live question? This will remove all answers and cannot be undone.')) {
      return;
    }

    setDeletingQuestionId(id);
    try {
      await supaclient.deleteLiveQuestion(id);
      fetchData();
    } catch (error: any) {
      console.error("Failed to delete live question:", error);
      alert(`Failed to delete live question: ${error.message || 'Please check console for details.'}`);
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleOpenManualAnswers = (questionId: string, questionText: string) => {
    setManualAnswersModal({ questionId, questionText });
    // Reset manual answers form
    setManualAnswers([
      { group_text: '', percentage: 0 },
      { group_text: '', percentage: 0 },
      { group_text: '', percentage: 0 },
      { group_text: '', percentage: 0 },
      { group_text: '', percentage: 0 },
      { group_text: '', percentage: 0 },
      { group_text: '', percentage: 0 },
      { group_text: '', percentage: 0 }
    ]);
  };

  const handleSubmitManualAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAnswersModal) return;

    // Filter out empty answers and validate percentages
    const validAnswers = manualAnswers.filter(a => a.group_text.trim() !== '' && a.percentage > 0);

    if (validAnswers.length === 0) {
      alert('Please enter at least one answer with a percentage greater than 0.');
      return;
    }

    // Check if percentages add up to 100
    const totalPercentage = validAnswers.reduce((sum, a) => sum + a.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      if (!confirm(`Percentages add up to ${totalPercentage.toFixed(1)}% instead of 100%. Continue anyway?`)) {
        return;
      }
    }

    try {
      await supaclient.setManualGroupedAnswers(manualAnswersModal.questionId, validAnswers);
      setManualAnswersModal(null);
      fetchData();
      alert('Manual answers set successfully! Question has been ended and scores awarded.');
    } catch (error: any) {
      console.error("Failed to set manual answers:", error);
      alert(`Failed to set manual answers: ${error.message || 'Please check console for details.'}`);
    }
  };

  const updateManualAnswer = (index: number, field: 'group_text' | 'percentage', value: string | number) => {
    const updated = [...manualAnswers];
    updated[index] = { ...updated[index], [field]: value };
    setManualAnswers(updated);
  };

  // Filter answers based on search and filters
  const filteredAnswers = allAnswers.filter(answer => {
    const matchesSearch = searchTerm === '' ||
      answer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.answer_text.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || answer.question_status === statusFilter;
    const matchesRole = roleFilter === 'all' || answer.discord_role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Export data as CSV
  const exportToCSV = () => {
    const headers = ['Date/Time', 'User ID', 'Username', 'Discord Role', 'Question ID', 'Question Text', 'Answer Text', 'Question Status'];
    const csvData = [
      headers.join(','),
      ...filteredAnswers.map(answer => [
        `"${new Date(answer.created_at).toLocaleString()}"`,
        `"${answer.user_id}"`,
        `"${answer.username}"`,
        `"${answer.discord_role || 'No Role'}"`,
        `"${answer.question_id}"`,
        `"${answer.question_text.replace(/"/g, '""')}"`,
        `"${answer.answer_text.replace(/"/g, '""')}"`,
        `"${answer.question_status}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nad-feud-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteSuggestion = async (id:string) => {
    await supaclient.deleteSuggestion(id);
    fetchData();
  }
  
  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setIsSubmitting(true);

    try {
      await supaclient.updateQuestion(editingQuestion.id, editForm.text, editForm.imageUrl || null);
      setEditingQuestion(null);
      fetchData();
    } catch (error: any) {
      console.error("Failed to update question:", error);
      alert(`Failed to update question: ${error.message || 'Please check console for details.'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this question?")) {
      await supaclient.deleteQuestion(id);
      fetchData();
    }
  }
  
  const handleCategorizeSuggestions = async () => {
      if (suggestions.length === 0 || isCategorizing) return;
      setIsCategorizing(true);
      setCategorizedSuggestions(null);

      try {
        const simpleSuggestions = suggestions.map(s => ({ id: s.id, text: s.text }));
        const categories: { id: string; category: string; }[] = await supaclient.categorizeSuggestions(simpleSuggestions);
        
        const categoryMap = new Map<string, SuggestionWithUser[]>();
        categories.forEach(catResult => {
            const suggestion = suggestions.find(s => s.id === catResult.id);
            if (suggestion) {
                if (!categoryMap.has(catResult.category)) {
                    categoryMap.set(catResult.category, []);
                }
                categoryMap.get(catResult.category)!.push(suggestion);
            }
        });

        const grouped = Array.from(categoryMap.entries()).map(([category, suggestions]) => ({
            category,
            suggestions
        })).sort((a, b) => a.category.localeCompare(b.category));

        setCategorizedSuggestions(grouped);

      } catch (error) {
        console.error("Failed to categorize suggestions:", error);
        alert("An error occurred while categorizing suggestions. Please check the console.");
      } finally {
        setIsCategorizing(false);
      }
  };

  const handleFirstConfirm = () => {
    if (resetConfirmText !== 'RESET') {
        alert("Confirmation text does not match. Please type 'RESET' to confirm.");
        return;
    }
    setShowResetConfirm(false);
    setShowSecondConfirm(true);
    setResetConfirmText('');
  };

  const handleResetData = async () => {
    if (secondConfirmText !== 'DELETE EVERYTHING') {
        alert("Please type 'DELETE EVERYTHING' to confirm.");
        return;
    }
    setIsResetting(true);
    try {
        await supaclient.resetAllData();
        alert("Game data has been successfully reset. All answers, groups, and scores have been cleared.");
        setShowSecondConfirm(false);
        setSecondConfirmText('');
        fetchData();
    } catch (error) {
        console.error("Failed to reset data:", error);
        alert("An error occurred while resetting the data. Check the console for more details.");
    } finally {
        setIsResetting(false);
    }
  };

  // Show loading screen while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-8"></div>
          <p className="text-slate-400 mb-4">Loading admin panel...</p>
          <p className="text-slate-500 text-sm">
            Verifying admin permissions
          </p>
        </div>
      </div>
    );
  }

  // Only redirect after authentication is complete and user is confirmed not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const TabButton: React.FC<{currentView: string; viewName: string; setView: (view: any) => void; children: React.ReactNode}> = ({currentView, viewName, setView, children}) => (
    <button onClick={() => setView(viewName)} className={`px-4 py-2 text-lg font-semibold rounded-t-lg transition-colors ${currentView === viewName ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:text-white'}`}>
        {children}
    </button>
  );

  const VerticalTabButton: React.FC<{currentView: string; viewName: string; setView: (view: any) => void; children: React.ReactNode}> = ({currentView, viewName, setView, children}) => (
    <button
      onClick={() => setView(viewName)}
      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        currentView === viewName
          ? 'bg-purple-600 text-white shadow-lg'
          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      {children}
    </button>
  );

  const renderSuggestions = () => {
    if (isCategorizing) {
        return <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div><p className="ml-4 text-slate-300">Categorizing...</p></div>;
    }

    if (categorizedSuggestions) {
      return (
        <div className="space-y-6">
          {categorizedSuggestions.map(group => (
            <div key={group.category}>
              <h3 className="text-xl font-semibold text-purple-300 mb-3 border-b-2 border-purple-500/20 pb-1">{group.category}</h3>
              <ul className="space-y-3">
                {group.suggestions.map(s => <SuggestionItem key={s.id} suggestion={s} onDelete={handleDeleteSuggestion} />)}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    if (suggestions.length === 0) {
      return <p className='text-slate-400'>No user suggestions.</p>;
    }

    return (
      <ul className="space-y-3">
        {suggestions.map(s => <SuggestionItem key={s.id} suggestion={s} onDelete={handleDeleteSuggestion} />)}
      </ul>
    );
  };
  
  const SuggestionItem: React.FC<{suggestion: SuggestionWithUser, onDelete: (id: string) => void}> = ({suggestion, onDelete}) => (
     <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
        <div className="flex items-center gap-3">
            {suggestion.users?.avatar_url ? (
              <img src={suggestion.users.avatar_url} alt={suggestion.users.username || 'user avatar'} className="w-8 h-8 rounded-full"/>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <UserIcon size={16} className="text-slate-400" />
              </div>
            )}
            <div>
                <p className="text-slate-200">{suggestion.text}</p>
                <p className="text-xs text-slate-400">by {suggestion.users?.username || 'Anonymous'}</p>
            </div>
        </div>
        <Button onClick={() => onDelete(suggestion.id)} variant="danger" className='px-3 py-2'>
            <Trash2 size={16}/>
        </Button>
    </li>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="flex">
        {/* Vertical Sidebar Navigation */}
        <div className="w-80 bg-slate-800 min-h-screen p-6 border-r border-slate-700">
          <h1 className="text-2xl font-bold mb-8 text-center text-purple-400">Admin Panel</h1>

          {/* Debug Tool */}
          <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
            <h3 className="text-sm font-semibold mb-2 text-slate-300">Debug Info</h3>
            <p className="text-xs text-slate-400 mb-1">User: {user?.username || 'Not logged in'}</p>
            <p className="text-xs text-slate-400 mb-1">Admin: {isAdmin ? 'Yes' : 'No'}</p>
            <p className="text-xs text-slate-400 mb-3">ID: {user?.discord_id || 'N/A'}</p>
            <button
              onClick={debugAuth}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs rounded transition-colors"
              title="Debug authentication info"
            >
              Debug Auth
            </button>
          </div>

          {/* Vertical Navigation Menu */}
          <nav className="space-y-2">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Questions</h3>
              <VerticalTabButton currentView={view} viewName="manage" setView={setView}>
                <List size={16} className="mr-3" />
                Manage Questions
              </VerticalTabButton>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggestions</h3>
              <VerticalTabButton currentView={view} viewName="suggestions" setView={setView}>
                <PlusCircle size={16} className="mr-3" />
                Question Suggestions
                <span className="ml-auto bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                  {suggestions.length}
                </span>
              </VerticalTabButton>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Highlights</h3>
              <VerticalTabButton currentView={view} viewName="highlight-suggestions" setView={setView}>
                <Twitter size={16} className="mr-3" />
                Highlight Suggestions
                <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {highlightSuggestions.length}
                </span>
              </VerticalTabButton>
              <VerticalTabButton currentView={view} viewName="featured-highlights" setView={setView}>
                <ImageIcon size={16} className="mr-3" />
                Featured Highlights
              </VerticalTabButton>
              <VerticalTabButton currentView={view} viewName="alltime-highlights" setView={setView}>
                <Star size={16} className="mr-3" />
                Daily & Weekly
              </VerticalTabButton>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Data & Analytics</h3>
              <VerticalTabButton currentView={view} viewName="datasheet" setView={setView}>
                <Download size={16} className="mr-3" />
                Data Sheet
                <span className="ml-auto bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  {allAnswers.length}
                </span>
              </VerticalTabButton>
              <VerticalTabButton currentView={view} viewName="bulk-links" setView={setView}>
                <Link size={16} className="mr-3" />
                Bulk Links
              </VerticalTabButton>
              <VerticalTabButton currentView={view} viewName="link-analytics" setView={setView}>
                <BarChart3 size={16} className="mr-3" />
                Analytics
              </VerticalTabButton>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          <div className="space-y-8">

      <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isDataLoading ? <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div> : (
            view === 'manage' ? (
                <div className="space-y-6">
                    {/* Create New Question */}
                    <Card>
                        <h2 className="text-2xl font-bold mb-4">Create New Question</h2>
                        <form onSubmit={handleCreateQuestion} className="space-y-4">
                            <input
                                type="text"
                                value={newQuestionText}
                                onChange={(e) => setNewQuestionText(e.target.value)}
                                placeholder="Question text..."
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                                required
                            />

                            <div className="space-y-4">
                                {imagePreview ? (
                                    <div className="relative group w-fit">
                                        <img src={imagePreview} alt="Selected preview" className="max-h-48 rounded-lg shadow-md"/>
                                        <Button type="button" variant="danger" onClick={removeImage} className="absolute top-2 right-2 !p-2 h-auto opacity-50 group-hover:opacity-100 transition-opacity">
                                            <X size={16}/>
                                        </Button>
                                    </div>
                                ) : (
                                    <label htmlFor="image-upload-input" className="w-full cursor-pointer bg-slate-800/60 hover:bg-slate-700/60 border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 transition-colors">
                                        <UploadCloud size={32} />
                                        <span className="mt-2 font-semibold">Upload an image</span>
                                        <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                                    </label>
                                )}
                                <input id="image-upload-input" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" />

                                <div className="flex items-center gap-4">
                                    <hr className="flex-grow border-slate-600"/>
                                    <span className="text-slate-400 font-semibold">OR</span>
                                    <hr className="flex-grow border-slate-600"/>
                                </div>

                                <input
                                    type="text"
                                    value={newQuestionImage}
                                    onChange={(e) => {
                                        setNewQuestionImage(e.target.value);
                                        removeImage();
                                    }}
                                    placeholder="Paste an image URL..."
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                                    disabled={!!selectedFile}
                                />
                            </div>

                            <Button type="submit" disabled={isSubmitting}>
                                <PlusCircle size={20}/>
                                {isSubmitting ? 'Creating...' : 'Create Question'}
                            </Button>
                        </form>
                    </Card>

                    {/* Live Question Management */}
                    <Card>
                        <h2 className="text-2xl font-bold mb-4">Live Question Management</h2>
                        {isDataLoading ? (
                            <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div></div>
                        ) : liveQuestions.length > 0 ? (
                            <ul className="space-y-3">
                                {liveQuestions.map(q => (
                                    <li key={q.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg gap-2">
                                        <p className="font-medium text-slate-200 flex-grow">{q.question_text}</p>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                                onClick={() => handleOpenManualAnswers(q.id, q.question_text)}
                                                variant='secondary'
                                                className='px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                                            >
                                                <Edit size={16}/> Manual Answers
                                            </Button>
                                            <Button
                                                onClick={() => handleEndQuestion(q.id)}
                                                variant='secondary'
                                                className='px-3 py-2 bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                                                disabled={endingQuestionId === q.id}
                                            >
                                                {endingQuestionId === q.id ? 'Ending...' : <><StopCircle size={16}/> Auto End</>}
                                            </Button>
                                            <Button
                                                onClick={() => handleDeleteLiveQuestion(q.id)}
                                                variant='danger'
                                                className='px-3 py-2'
                                                disabled={deletingQuestionId === q.id}
                                            >
                                                {deletingQuestionId === q.id ? 'Deleting...' : <><Trash2 size={16}/> Delete</>}
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className='text-slate-400'>No questions are currently live. Start one from the "Manage Questions" section.</p>
                        )}
                    </Card>

                    {/* Pending Questions */}
                    <Card>
                        <h2 className="text-2xl font-bold mb-4">Pending Questions</h2>
                        <ul className="space-y-3">
                            {pendingQuestions.map(q => (
                                <li key={q.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg gap-2">
                                    <span className="text-slate-200 flex-grow">{q.question_text}</span>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button onClick={() => setEditingQuestion(q)} variant='secondary' className='px-3 py-2'>
                                            <Edit size={16}/>
                                        </Button>
                                        <Button onClick={() => handleDeleteQuestion(q.id)} variant='danger' className='px-3 py-2'>
                                            <Trash2 size={16}/>
                                        </Button>
                                        <Button onClick={() => handleStartQuestion(q.id)} variant='secondary' className='bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'>
                                            <Play size={16}/> Start
                                        </Button>
                                    </div>
                                </li>
                            ))}
                            {pendingQuestions.length === 0 && <p className='text-slate-400'>No pending questions.</p>}
                        </ul>
                    </Card>
                </div>
            ) : view === 'suggestions' ? (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-2xl font-bold">User Suggestions</h2>
                        <div className="flex gap-2">
                            {suggestionTab === 'questions' && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={handleCategorizeSuggestions}
                                        disabled={suggestions.length === 0 || isCategorizing || !!categorizedSuggestions}
                                    >
                                        <Layers size={16} /> Auto-Categorize
                                    </Button>
                                    {categorizedSuggestions && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => setCategorizedSuggestions(null)}
                                        >
                                            <List size={16} /> Show All
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Suggestion Tabs */}
                    <div className="flex border-b border-slate-700 mb-4">
                        <button
                            onClick={() => setSuggestionTab('questions')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                suggestionTab === 'questions'
                                    ? 'border-purple-500 text-purple-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            💭 Question Suggestions ({suggestions.length})
                        </button>
                        <button
                            onClick={() => setSuggestionTab('highlights')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                suggestionTab === 'highlights'
                                    ? 'border-purple-500 text-purple-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            🌟 Highlight Suggestions ({highlightSuggestions.length})
                        </button>
                    </div>

                    {suggestionTab === 'questions' ? (
                        renderSuggestions()
                    ) : (
                        <div className="space-y-4">
                            {highlightSuggestions.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-400 mb-4">No highlight suggestions yet.</p>
                                    <p className="text-slate-500 text-sm">
                                        Users can suggest highlights by sharing Twitter links or other social media content.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {highlightSuggestions.map(suggestion => (
                                        <div key={suggestion.id} className="bg-slate-800/50 p-4 rounded-lg">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-blue-400 font-medium">🐦 Twitter Link</span>
                                                        <span className="text-slate-500 text-sm">
                                                            by {suggestion.suggested_by}
                                                        </span>
                                                    </div>
                                                    <a
                                                        href={suggestion.twitter_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-purple-400 hover:text-purple-300 underline break-all"
                                                    >
                                                        {suggestion.twitter_url}
                                                    </a>
                                                    {suggestion.description && (
                                                        <p className="text-slate-300 mt-2">{suggestion.description}</p>
                                                    )}
                                                    <p className="text-slate-500 text-xs mt-2">
                                                        {new Date(suggestion.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => window.open(suggestion.twitter_url, '_blank')}
                                                    >
                                                        <Eye size={14} /> View
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => {
                                                            setHighlightSuggestions(prev =>
                                                                prev.filter(s => s.id !== suggestion.id)
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            ) : view === 'highlight-suggestions' ? (
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <Twitter className="text-blue-400" size={24} />
                        <h2 className="text-2xl font-bold text-white">Highlight Suggestions</h2>
                        <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full text-sm">
                            {highlightSuggestions.length} suggestions
                        </span>
                    </div>

                    {highlightSuggestions.length === 0 ? (
                        <div className="text-center py-12">
                            <Twitter className="mx-auto text-slate-600 mb-4" size={48} />
                            <p className="text-slate-400 text-lg">No highlight suggestions yet</p>
                            <p className="text-slate-500 text-sm mt-2">
                                Users can suggest highlights from the homepage
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {highlightSuggestions.map((suggestion) => (
                                <div key={suggestion.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex items-center gap-2">
                                                    {suggestion.users?.avatar_url ? (
                                                        <img
                                                            src={suggestion.users.avatar_url}
                                                            alt={suggestion.users.username || 'User'}
                                                            className="w-6 h-6 rounded-full"
                                                        />
                                                    ) : (
                                                        <UserIcon size={16} className="text-slate-400" />
                                                    )}
                                                    <span className="text-sm text-slate-300">
                                                        {suggestion.users?.username || 'Unknown User'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(suggestion.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="mb-3">
                                                <a
                                                    href={suggestion.twitter_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                                                >
                                                    <Twitter size={16} />
                                                    <span className="text-sm font-mono break-all">
                                                        {suggestion.twitter_url}
                                                    </span>
                                                    <ExternalLink size={12} />
                                                </a>
                                            </div>

                                            {/* Twitter Preview */}
                                            <div className="mb-3">
                                                <TwitterPreview twitterUrl={suggestion.twitter_url} />
                                            </div>

                                            {suggestion.description && (
                                                <div className="mb-3">
                                                    <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded border-l-2 border-blue-500">
                                                        "{suggestion.description}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => convertToHighlight(suggestion)}
                                                className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-600/50"
                                            >
                                                <CheckCircle size={14} className="mr-1" />
                                                Convert
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => deleteHighlightSuggestion(suggestion.id)}
                                                className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-600/50"
                                            >
                                                <Trash2 size={14} className="mr-1" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            ) : view === 'datasheet' ? (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-2xl font-bold">Data Sheet - All Answers & Questions</h2>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-400">
                                Showing {filteredAnswers.length} of {allAnswers.length} answers
                            </div>
                            <Button
                                onClick={exportToCSV}
                                variant="secondary"
                                className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
                                disabled={filteredAnswers.length === 0}
                            >
                                <Download size={16} /> Export CSV
                            </Button>
                        </div>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-800/30 rounded-lg">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search users, questions, answers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="live">Live</option>
                                <option value="ended">Ended</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>

                        <div>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="all">All Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Full Access">Full Access</option>
                                <option value="NADSOG">NADSOG</option>
                                <option value="Mon">Mon</option>
                                <option value="Nads">Nads</option>
                            </select>
                        </div>

                        <div className="flex items-center">
                            <Button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setRoleFilter('all');
                                }}
                                variant="secondary"
                                className="w-full"
                            >
                                <X size={16} /> Clear Filters
                            </Button>
                        </div>
                    </div>

                    {allAnswers.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No answers submitted yet.</p>
                    ) : filteredAnswers.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No answers match your current filters.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-600">
                                        <th className="text-left p-3 font-semibold text-slate-300">Date/Time</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">User</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">Role</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">Question</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">Answer</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAnswers.map((answer, index) => (
                                        <tr key={answer.id} className={`border-b border-slate-700/50 ${index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'}`}>
                                            <td className="p-3 text-slate-300">
                                                {new Date(answer.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {answer.avatar_url && (
                                                        <img
                                                            src={answer.avatar_url}
                                                            alt={answer.username}
                                                            className="w-6 h-6 rounded-full"
                                                        />
                                                    )}
                                                    <span className="text-slate-200 font-medium">{answer.username}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    answer.discord_role === 'Admin' ? 'bg-red-900/50 text-red-300' :
                                                    answer.discord_role === 'Full Access' ? 'bg-purple-900/50 text-purple-300' :
                                                    answer.discord_role === 'NADSOG' ? 'bg-blue-900/50 text-blue-300' :
                                                    answer.discord_role === 'Mon' ? 'bg-green-900/50 text-green-300' :
                                                    answer.discord_role === 'Nads' ? 'bg-yellow-900/50 text-yellow-300' :
                                                    'bg-slate-700/50 text-slate-300'
                                                }`}>
                                                    {answer.discord_role || 'No Role'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-200 max-w-xs">
                                                <div className="truncate" title={answer.question_text}>
                                                    {answer.question_text}
                                                </div>
                                            </td>
                                            <td className="p-3 text-slate-100 font-medium">
                                                {answer.answer_text}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    answer.question_status === 'live' ? 'bg-green-900/50 text-green-300' :
                                                    answer.question_status === 'ended' ? 'bg-blue-900/50 text-blue-300' :
                                                    answer.question_status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' :
                                                    'bg-slate-700/50 text-slate-300'
                                                }`}>
                                                    {answer.question_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            ) : view === 'featured-highlights' ? (
                <CommunityHighlightsManager showAllHighlights={false} />
            ) : view === 'alltime-highlights' ? (
                <CommunityHighlightsManager showAllHighlights={true} />
            ) : view === 'bulk-links' ? (
                <BulkLinkManager />
            ) : view === 'link-analytics' ? (
                <LinkAnalytics />
            ) : null
        )}
      </motion.div>
      </AnimatePresence>
      
      <Card className="max-w-md">
          <h3 className="text-lg font-bold mb-2 text-red-400">Danger Zone</h3>
          <div className="border border-red-500/30 bg-red-900/20 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-1">Reset All Game Data</h4>
            <p className="text-slate-300 text-xs mb-3">Permanently delete all data. Cannot be undone.</p>
            <Button variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>Reset All Data</Button>
          </div>
      </Card>
      
      {/* Edit Question Modal */}
      <AnimatePresence>
        {editingQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingQuestion(null)}
          >
            <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Edit Question</h2>
              <form onSubmit={handleUpdateQuestion} className="space-y-4">
                  <input
                    type="text"
                    value={editForm.text}
                    onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                    placeholder="Question text..."
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                  <input
                    type="text"
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({...editForm, imageUrl: e.target.value})}
                    placeholder="Image URL (optional)..."
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                  />
                  <div className="flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={() => setEditingQuestion(null)}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
                  </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowResetConfirm(false)}
          >
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Reset Game Data</h2>
                        <p className="text-slate-300 mt-2">
                            Are you absolutely sure? This will permanently delete all answers, groups, and reset all user scores. This cannot be undone.
                        </p>
                         <p className="text-slate-300 mt-2 font-semibold">
                            To confirm, please type <strong className="text-red-400">RESET</strong> in the box below.
                        </p>
                    </div>
                </div>
                <div className="mt-4 space-y-3">
                    <input
                        type="text"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-red-500 focus:border-red-500"
                        placeholder="RESET"
                    />
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleFirstConfirm}
                            disabled={resetConfirmText !== 'RESET'}
                        >
                            {isResetting ? "Resetting..." : "Confirm Reset"}
                        </Button>
                    </div>
                </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Second Reset Confirmation Modal */}
      <AnimatePresence>
        {showSecondConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSecondConfirm(false)}
          >
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">FINAL CONFIRMATION</h3>
                        <p className="text-slate-300 mt-2">
                            This is your FINAL warning. You are about to permanently delete ALL game data including:
                        </p>
                        <ul className="text-red-300 mt-2 text-sm list-disc list-inside">
                            <li>All user answers and responses</li>
                            <li>All grouped results and statistics</li>
                            <li>All user scores and rankings</li>
                            <li>All question history</li>
                        </ul>
                        <p className="text-red-400 font-bold mt-3">
                            This action is IRREVERSIBLE and cannot be undone!
                        </p>
                    </div>
                </div>
                <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Type <span className="text-red-400 font-bold">"DELETE EVERYTHING"</span> to confirm:
                    </label>
                    <input
                        type="text"
                        value={secondConfirmText}
                        onChange={(e) => setSecondConfirmText(e.target.value)}
                        className="w-full bg-slate-900/50 border border-red-600 rounded-lg px-4 py-3 text-white focus:ring-red-500 focus:border-red-500"
                        placeholder="DELETE EVERYTHING"
                    />
                    <div className="flex justify-end gap-3 mt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowSecondConfirm(false)}>Cancel</Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleResetData}
                            disabled={secondConfirmText !== 'DELETE EVERYTHING' || isResetting}
                        >
                            {isResetting ? 'Deleting...' : 'DELETE EVERYTHING'}
                        </Button>
                    </div>
                </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Answers Modal */}
      <AnimatePresence>
        {manualAnswersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setManualAnswersModal(null)}
          >
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Set Manual Top 8 Answers</h2>
              <p className="text-slate-300 mb-4">Question: <span className="font-semibold">{manualAnswersModal.questionText}</span></p>

              <form onSubmit={handleSubmitManualAnswers} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {manualAnswers.map((answer, index) => (
                    <div key={index} className="bg-slate-800/50 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Answer #{index + 1}</h4>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={answer.group_text}
                          onChange={(e) => updateManualAnswer(index, 'group_text', e.target.value)}
                          placeholder={`Answer ${index + 1} text...`}
                          className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={answer.percentage}
                            onChange={(e) => updateManualAnswer(index, 'percentage', parseFloat(e.target.value) || 0)}
                            placeholder="Percentage"
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-24 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                          />
                          <span className="text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-sm text-slate-300">
                    <strong>Total:</strong> {manualAnswers.reduce((sum, a) => sum + a.percentage, 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    💡 Tip: Percentages should ideally add up to 100%. Empty answers will be ignored.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    onClick={() => setManualAnswersModal(null)}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="secondary" className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500">
                    Set Answers & End Question
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
