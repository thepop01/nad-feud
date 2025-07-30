
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { supaclient } from '../services/supabase';
import { Question, SuggestionWithUser, CategorizedSuggestionGroup, HighlightSuggestionWithUser, CommunityHighlight, AllTimeCommunityHighlight } from '../types';
import { PlusCircle, Trash2, Play, User as UserIcon, UploadCloud, X, StopCircle, Edit, Layers, List, Search, Download, Filter, Star, Image as ImageIcon, Twitter, ExternalLink, CheckCircle, Clock, Link, BarChart3, Target } from 'lucide-react';
import EventTaskManager from '../components/EventTaskManager';

import CommunityHighlightsManager from '../components/CommunityHighlightsManager';
import AllTimeCommunityHighlightsManager from '../components/AllTimeCommunityHighlightsManager';
import TwitterPreview from '../components/TwitterPreview';
import BulkLinkManager from '../components/BulkLinkManager';
import LinkAnalytics from '../components/LinkAnalytics';
import FeaturedHighlightsManager from '../components/FeaturedHighlightsManager';

const AdminPage: React.FC = () => {
  const { isAdmin, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'manage' | 'suggestions' | 'datasheet' | 'featured-highlights' | 'alltime-highlights' | 'highlight-suggestions' | 'highlights-data' | 'bulk-links' | 'link-analytics' | 'events-tasks'>('manage');
  
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [endedQuestions, setEndedQuestions] = useState<(Question & { is_approved: boolean })[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionWithUser[]>([]);
  const [highlightSuggestions, setHighlightSuggestions] = useState<HighlightSuggestionWithUser[]>([]);

  // State for manage questions tabs
  const [manageQuestionsTab, setManageQuestionsTab] = useState<'live' | 'ended'>('live');

  // State for question details overlay
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionDetails, setQuestionDetails] = useState<{
    id: string;
    answer_text: string;
    created_at: string;
    user_id: string;
    discord_id: string;
    username: string;
    avatar_url: string | null;
    discord_role: string | null;
    total_score: number;
  }[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [allAnswers, setAllAnswers] = useState<{
    id: string;
    answer_text: string;
    created_at: string;
    question_id: string;
    question_text: string;
    question_status: string;
    user_id: string;
    discord_id: string;
    username: string;
    avatar_url: string | null;
    discord_role: string | null;
  }[]>([]);

  // State for user data
  const [userData, setUserData] = useState<{
    user_id: string;
    username: string;
    discord_id: string;
    discord_role: string | null;
    total_score: number;
    questions_answered: number;
  }[]>([]);

  // State for all-time highlights data
  const [allTimeHighlights, setAllTimeHighlights] = useState<AllTimeCommunityHighlight[]>([]);

  // State for highlight conversion modal
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [convertingSuggestion, setConvertingSuggestion] = useState<HighlightSuggestionWithUser | null>(null);
  const [conversionForm, setConversionForm] = useState({
    title: '',
    description: '',
    category: 'gaming' as 'gaming' | 'community' | 'events' | 'achievements' | 'memories',
    media_type: 'image' as 'image' | 'video' | 'gif',
    media_url: '',
    uploadMethod: 'file' as 'file' | 'url'
  });
  const [conversionFile, setConversionFile] = useState<File | null>(null);
  const [conversionPreview, setConversionPreview] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [newQuestionAnswerType, setNewQuestionAnswerType] = useState<'username' | 'general'>('general');
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

  // User data filters
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'Admin' | 'Full Access' | 'NADSOG' | 'Mon' | 'Nads'>('all');

  // User profile modal state
  // Function to navigate to user profile
  const navigateToUserProfile = (discordUserId: string) => {
    navigate(`/profile/${discordUserId}`);
  };

  // State for editing questions
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState({ text: '', imageUrl: '', answerType: 'general' as 'username' | 'general' });
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  // State for suggestion to question modal
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionWithUser | null>(null);
  const [suggestionForm, setSuggestionForm] = useState({
    text: '',
    imageUrl: '',
    answerType: 'general' as 'username' | 'general'
  });
  const [suggestionSelectedFile, setSuggestionSelectedFile] = useState<File | null>(null);
  const [suggestionImagePreview, setSuggestionImagePreview] = useState<string | null>(null);
  

  



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
        const [pQuestions, suggs, liveQs, answers, highlightSuggs, users, allTimeHighlightsData] = await Promise.all([
          supaclient.getPendingQuestions(),
          supaclient.getSuggestions(),
          supaclient.getLiveQuestions(),
          supaclient.getAllAnswersWithDetails(),
          supaclient.getHighlightSuggestions(),
          supaclient.getUserData(),
          supaclient.getAllTimeHighlights(),
        ]);

        // Fetch ended questions for admin (all ended questions, approved and unapproved)
        let endedQs: (Question & { is_approved: boolean })[] = [];
        try {
          const endedQuestionsData = await supaclient.getAllEndedQuestionsForAdmin();
          endedQs = endedQuestionsData.map(item => item.question);
        } catch (endedError) {
          console.warn("Could not fetch ended questions for admin:", endedError);
          // Continue without ended questions rather than failing completely
        }

        setPendingQuestions(pQuestions);
        setSuggestions(suggs);
        setLiveQuestions(liveQs);
        setEndedQuestions(endedQs);
        setAllAnswers(answers);
        setHighlightSuggestions(highlightSuggs);
        setUserData(users);
        setAllTimeHighlights(allTimeHighlightsData);

    } catch(error) {
        console.error("Failed to fetch admin data:", error);
        alert("Could not load admin data.");
    } finally {
        setIsDataLoading(false);
    }
  }, []);

  const openConversionModal = (suggestion: HighlightSuggestionWithUser) => {
    setConvertingSuggestion(suggestion);
    setConversionForm({
      title: suggestion.description || 'Community Highlight',
      description: suggestion.description || '',
      category: 'gaming',
      media_type: 'image',
      media_url: '',
      uploadMethod: 'file'
    });
    setConversionFile(null);
    setConversionPreview(null);
    setShowConversionModal(true);
  };

  const handleConversionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setConversionFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setConversionPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const convertToHighlight = async () => {
    if (!user || !convertingSuggestion) return;

    setIsConverting(true);
    try {
      let mediaUrl = conversionForm.media_url;

      // Upload file if using file method
      if (conversionForm.uploadMethod === 'file' && conversionFile) {
        mediaUrl = await supaclient.uploadCommunityHighlightMedia(conversionFile, user.id);
      }

      if (!mediaUrl) {
        alert('Please provide a media file or URL');
        setIsConverting(false);
        return;
      }

      // Create highlight in ALL-TIME highlights table (not community_highlights)
      const newHighlight = {
        title: conversionForm.title,
        description: `${conversionForm.description}${conversionForm.description ? ' ' : ''}[Suggested by: ${convertingSuggestion.users?.username || 'Anonymous'}]`,
        media_type: conversionForm.media_type,
        media_url: mediaUrl,
        embedded_link: convertingSuggestion.twitter_url,
        category: conversionForm.category,
        is_featured: false,
        display_order: 1,
        uploaded_by: user.id,
        created_by: user.id,
      };

      await supaclient.createAllTimeHighlight(newHighlight);
      await supaclient.deleteHighlightSuggestion(convertingSuggestion.id);

      alert('Highlight suggestion converted successfully! It will now appear on the Highlights page.');
      setShowConversionModal(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to convert suggestion to highlight:', error);
      alert(`Failed to convert suggestion to highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConverting(false);
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

      await supaclient.createQuestion(newQuestionText, finalImageUrl, newQuestionAnswerType);

      setNewQuestionText('');
      setNewQuestionImage('');
      setNewQuestionAnswerType('general');
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

  const handleViewQuestionDetails = async (questionId: string) => {
    setSelectedQuestionId(questionId);
    setIsLoadingDetails(true);
    try {
      // Filter answers for this specific question
      const questionAnswers = allAnswers.filter(answer => answer.question_id === questionId);

      // Get user scores from leaderboard data
      const leaderboard = await supaclient.getLeaderboard();
      const userScoreMap = new Map(leaderboard.map(user => [user.id, user.total_score]));

      // Combine answer data with user scores
      const answersWithScores = questionAnswers.map(answer => ({
        id: answer.id,
        answer_text: answer.answer_text,
        created_at: answer.created_at,
        user_id: answer.user_id,
        discord_id: answer.discord_id,
        username: answer.username,
        avatar_url: answer.avatar_url,
        discord_role: answer.discord_role,
        total_score: userScoreMap.get(answer.user_id) || 0
      }));

      // Sort by creation time (newest first)
      answersWithScores.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setQuestionDetails(answersWithScores);
    } catch (error) {
      console.error("Failed to fetch question details:", error);
      alert("Could not load question details.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeQuestionDetails = () => {
    setSelectedQuestionId(null);
    setQuestionDetails([]);
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

  // Filter users based on search and filters
  const filteredUsers = userData.filter(user => {
    const matchesSearch = userSearchTerm === '' ||
      user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.discord_id.toLowerCase().includes(userSearchTerm.toLowerCase());

    const matchesRole = userRoleFilter === 'all' || user.discord_role === userRoleFilter;

    return matchesSearch && matchesRole;
  });

  // Export user data as CSV
  const exportUserDataToCSV = () => {
    const headers = ['Username', 'User Discord ID', 'Role', 'Total Score', 'Number of Question Answered'];
    const csvData = [
      headers.join(','),
      ...filteredUsers.map(user => [
        `"${user.username}"`,
        `"${user.discord_id}"`,
        `"${user.discord_role || 'No Role'}"`,
        user.total_score,
        user.questions_answered
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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
    a.download = `feud-data-${new Date().toISOString().split('T')[0]}.csv`;
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
    if (!editingQuestion || !user) return;
    setIsSubmitting(true);

    try {
      let finalImageUrl: string | null = null;

      // Handle file upload if a file is selected
      if (editSelectedFile) {
        finalImageUrl = await supaclient.uploadQuestionImage(editSelectedFile, user.id);
      } else if (editForm.imageUrl) {
        // Use URL if provided and no file selected
        finalImageUrl = editForm.imageUrl;
      }

      await supaclient.updateQuestion(editingQuestion.id, editForm.text, finalImageUrl, editForm.answerType);
      setEditingQuestion(null);
      setEditSelectedFile(null);
      setEditImagePreview(null);
      fetchData();
    } catch (error: any) {
      console.error("Failed to update question:", error);
      alert(`Failed to update question: ${error.message || 'Please check console for details.'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleOpenSuggestionModal = (suggestion: SuggestionWithUser) => {
    setSelectedSuggestion(suggestion);
    setSuggestionForm({
      text: suggestion.text,
      imageUrl: '',
      answerType: 'general'
    });
    setSuggestionSelectedFile(null);
    setSuggestionImagePreview(null);
  };

  const handleSuggestionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, GIF, etc.).');
        e.target.value = ''; // Reset input
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image file must be less than 10MB.');
        e.target.value = ''; // Reset input
        return;
      }

      setSuggestionSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setSuggestionImagePreview(e.target?.result as string);
      };
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
        setSuggestionSelectedFile(null);
        setSuggestionImagePreview(null);
      };
      reader.readAsDataURL(file);

      // Clear URL input when file is selected
      setSuggestionForm({...suggestionForm, imageUrl: ''});
    }
  };

  const removeSuggestionImage = () => {
    setSuggestionSelectedFile(null);
    setSuggestionImagePreview(null);
    setSuggestionForm({...suggestionForm, imageUrl: ''});
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, GIF, etc.).');
        e.target.value = ''; // Reset input
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image file must be less than 10MB.');
        e.target.value = ''; // Reset input
        return;
      }

      setEditSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditImagePreview(e.target?.result as string);
      };
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
        setEditSelectedFile(null);
        setEditImagePreview(null);
      };
      reader.readAsDataURL(file);

      // Clear URL input when file is selected
      setEditForm({...editForm, imageUrl: ''});
    }
  };

  const removeEditImage = () => {
    setEditSelectedFile(null);
    setEditImagePreview(null);
    setEditForm({...editForm, imageUrl: ''});
  };

  const handleCreateQuestionFromSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuggestion || !user) return;
    setIsSubmitting(true);

    try {
      let finalImageUrl: string | null = null;

      // Handle file upload if a file is selected
      if (suggestionSelectedFile) {
        finalImageUrl = await supaclient.uploadQuestionImage(suggestionSelectedFile, user.id);
      } else if (suggestionForm.imageUrl) {
        // Use URL if provided and no file selected
        finalImageUrl = suggestionForm.imageUrl;
      }

      // Create and start the question directly
      await supaclient.createAndStartQuestion(suggestionForm.text, finalImageUrl, suggestionForm.answerType);

      // Delete the suggestion
      await supaclient.deleteSuggestion(selectedSuggestion.id);

      setSelectedSuggestion(null);
      setSuggestionForm({ text: '', imageUrl: '', answerType: 'general' });
      setSuggestionSelectedFile(null);
      setSuggestionImagePreview(null);
      fetchData();
      alert('Question created and is now live!');
    } catch (error: any) {
      console.error("Failed to create question from suggestion:", error);
      alert(`Failed to create question: ${error.message || 'Please check console for details.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this question?")) {
      await supaclient.deleteQuestion(id);
      fetchData();
    }
  }

  const handleApproveEndedQuestion = async (questionId: string) => {
    if (!user) return;

    try {
      await supaclient.approveEndedQuestion(questionId);
      await fetchData(); // Refresh data
      alert("Question approved! It will now appear on the homepage.");
    } catch (error) {
      console.error("Failed to approve question:", error);
      alert("Could not approve question.");
    }
  };

  const handleUnapproveEndedQuestion = async (questionId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to remove this question from the homepage?")) return;

    try {
      await supaclient.unapproveEndedQuestion(questionId);
      await fetchData(); // Refresh data
      alert("Question removed from homepage.");
    } catch (error) {
      console.error("Failed to unapprove question:", error);
      alert("Could not unapprove question.");
    }
  };




  // Show loading screen while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 bg-purple-500 mx-auto mb-8"></div>
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
    <button onClick={() => setView(viewName)} className={`px-4 py-2 text-lg font-semibold transition-colors ${currentView === viewName ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:text-white'}`}>
        {children}
    </button>
  );

  const VerticalTabButton: React.FC<{currentView: string; viewName: string; setView: (view: any) => void; children: React.ReactNode}> = ({currentView, viewName, setView, children}) => (
    <button
      onClick={() => setView(viewName)}
      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
        currentView === viewName
          ? 'bg-purple-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}
    >
      {children}
    </button>
  );

  const renderSuggestions = () => {
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
     <li className="flex items-center justify-between p-3 bg-slate-800/50">
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
                <p className="text-xs text-slate-400">
                    by {suggestion.users?.discord_user_id ? (
                        <button
                            onClick={() => navigateToUserProfile(suggestion.users.discord_user_id)}
                            className="text-slate-400 hover:text-purple-400 hover:underline transition-colors cursor-pointer"
                        >
                            {suggestion.users.username || 'Anonymous'}
                        </button>
                    ) : (
                        <span>{suggestion.users?.username || 'Anonymous'}</span>
                    )}
                </p>
            </div>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => handleOpenSuggestionModal(suggestion)} variant="secondary" className='px-3 py-2 bg-green-600 hover:bg-green-700'>
                <Play size={16}/> Make Live
            </Button>
            <Button onClick={() => onDelete(suggestion.id)} variant="danger" className='px-3 py-2'>
                <Trash2 size={16}/>
            </Button>
        </div>
    </li>
  );

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 bg-slate-900 text-slate-200 z-[100] overflow-hidden">
      <div className="flex h-full w-full">
        {/* Left Panel - Categories & Navigation */}
        <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col">
          {/* Fixed Header */}
          <div className="p-6 border-b border-slate-700">
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Debug Tool */}
            <div className="mb-6 p-4 bg-slate-800/50">
              <h3 className="text-sm font-semibold mb-2 text-slate-300">Debug Info</h3>
              <p className="text-xs text-slate-400 mb-1">User: {user?.username || 'Not logged in'}</p>
              <p className="text-xs text-slate-400 mb-1">Admin: {isAdmin ? 'Yes' : 'No'}</p>
              <p className="text-xs text-slate-400 mb-3">ID: {user?.discord_id || 'N/A'}</p>
              <button
                onClick={debugAuth}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs transition-colors"
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
                  All Time Highlights
                </VerticalTabButton>
                <VerticalTabButton currentView={view} viewName="highlights-data" setView={setView}>
                  <Download size={16} className="mr-3" />
                  Highlights Data
                  <span className="ml-auto bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
                    {allTimeHighlights.length}
                  </span>
                </VerticalTabButton>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Events & Tasks</h3>
                <VerticalTabButton currentView={view} viewName="events-tasks" setView={setView}>
                  <Target size={16} className="mr-3" />
                  Manage Events/Tasks
                </VerticalTabButton>

              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Data & Analytics</h3>
                <VerticalTabButton currentView={view} viewName="datasheet" setView={setView}>
                  <Download size={16} className="mr-3" />
                  User Data
                  <span className="ml-auto bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    {userData.length}
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
        </div>

        {/* Right Panel - Main Content */}
        <div className="flex-1 flex flex-col bg-slate-900">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
        {isDataLoading ? <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div> : (
            view === 'manage' ? (
                <div className="space-y-6">
                    {/* Create New Question */}
                    <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-white">Create New Question</h2>
                        <form onSubmit={handleCreateQuestion} className="space-y-4">
                            <input
                                type="text"
                                value={newQuestionText}
                                onChange={(e) => setNewQuestionText(e.target.value)}
                                placeholder="Question text..."
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />

                            {/* Answer Type Selection */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-300">
                                    Expected Answer Type
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="answerType"
                                            value="general"
                                            checked={newQuestionAnswerType === 'general'}
                                            onChange={(e) => setNewQuestionAnswerType(e.target.value as 'general')}
                                            className="mr-2 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-slate-300">General Answer</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="answerType"
                                            value="username"
                                            checked={newQuestionAnswerType === 'username'}
                                            onChange={(e) => setNewQuestionAnswerType(e.target.value as 'username')}
                                            className="mr-2 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-slate-300">Username Answer</span>
                                    </label>
                                </div>
                                <p className="text-xs text-slate-400">
                                    {newQuestionAnswerType === 'username'
                                        ? 'Participants will be expected to answer with a username or person\'s name.'
                                        : 'Participants can answer with any text, number, or general response.'
                                    }
                                </p>
                            </div>

                            <div className="space-y-4">
                                {imagePreview ? (
                                    <div className="relative group w-fit">
                                        <img src={imagePreview} alt="Selected preview" className="max-h-48"/>
                                        <Button type="button" variant="danger" onClick={removeImage} className="absolute top-2 right-2 !p-2 h-auto opacity-50 group-hover:opacity-100 transition-opacity">
                                            <X size={16}/>
                                        </Button>
                                    </div>
                                ) : (
                                    <label htmlFor="image-upload-input" className="w-full cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center text-slate-300 transition-colors">
                                        <UploadCloud size={32} />
                                        <span className="mt-2 font-semibold">Upload an image</span>
                                        <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                                    </label>
                                )}
                                <input id="image-upload-input" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" />

                                <div className="flex items-center gap-4">
                                    <div className="flex-grow h-px bg-slate-600"></div>
                                    <span className="text-slate-400 font-semibold">OR</span>
                                    <div className="flex-grow h-px bg-slate-600"></div>
                                </div>

                                <input
                                    type="text"
                                    value={newQuestionImage}
                                    onChange={(e) => {
                                        setNewQuestionImage(e.target.value);
                                        removeImage();
                                    }}
                                    placeholder="Paste an image URL..."
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                                    disabled={!!selectedFile}
                                />
                            </div>

                            <Button type="submit" disabled={isSubmitting}>
                                <PlusCircle size={20}/>
                                {isSubmitting ? 'Creating...' : 'Create Question'}
                            </Button>
                        </form>
                    </div>

                    {/* Question Management with Tabs */}
                    <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white">Question Management</h2>
                        </div>

                        {/* Question Management Tabs */}
                        <div className="flex mb-4 bg-slate-800/50 rounded-lg p-1">
                            <button
                                onClick={() => setManageQuestionsTab('live')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                                    manageQuestionsTab === 'live'
                                        ? 'bg-purple-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                <Play size={16} />
                                Live Questions ({liveQuestions.length})
                            </button>
                            <button
                                onClick={() => setManageQuestionsTab('ended')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                                    manageQuestionsTab === 'ended'
                                        ? 'bg-purple-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                            >
                                <StopCircle size={16} />
                                Ended Questions ({endedQuestions.length})
                            </button>
                        </div>

                        {/* Tab Content */}
                        {manageQuestionsTab === 'live' ? (
                            <div>
                                {isDataLoading ? (
                                    <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 bg-purple-500"></div></div>
                                ) : liveQuestions.length > 0 ? (
                                    <ul className="space-y-3">
                                        {liveQuestions.map(q => (
                                            <li key={q.id} className="flex items-center justify-between p-3 bg-slate-700/50 border border-slate-600 rounded-lg gap-2 mb-2">
                                                <p className="font-medium text-white flex-grow">{q.question_text}</p>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <Button
                                                        onClick={() => handleViewQuestionDetails(q.id)}
                                                        variant='secondary'
                                                        className='px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500'
                                                    >
                                                        <Play size={16}/> View Details
                                                    </Button>

                                                    <Button
                                                        onClick={() => {
                                                            setEditingQuestion(q);
                                                            setEditForm({
                                                                text: q.question_text,
                                                                imageUrl: q.image_url || '',
                                                                answerType: (q as any).answer_type || 'general'
                                                            });
                                                            setEditSelectedFile(null);
                                                            setEditImagePreview(null);
                                                        }}
                                                        variant='secondary'
                                                        className='px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                                                    >
                                                        <Edit size={16}/> Edit
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
                                    <p className='text-slate-400'>No questions are currently live. Start one from the "Pending Questions" section below.</p>
                                )}
                            </div>
                        ) : (
                            <div>
                                {isDataLoading ? (
                                    <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div></div>
                                ) : endedQuestions.length > 0 ? (
                                    <ul className="space-y-3">
                                        {endedQuestions.map(q => (
                                            <li key={q.id} className={`flex items-center justify-between p-3 border rounded-lg gap-2 mb-2 ${
                                                q.is_approved
                                                  ? 'bg-green-900/20 border-green-600/30'
                                                  : 'bg-yellow-900/20 border-yellow-600/30'
                                            }`}>
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-medium text-white">{q.question_text}</p>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            q.is_approved
                                                              ? 'bg-green-600/20 text-green-300 border border-green-500/30'
                                                              : 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30'
                                                        }`}>
                                                            {q.is_approved ? '✅ Approved' : '⏳ Pending Review'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        Ended: {new Date(q.created_at).toLocaleDateString()}
                                                        {q.is_approved && ' • Visible on Homepage'}
                                                        {!q.is_approved && ' • Hidden from Homepage'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <Button
                                                        onClick={() => handleViewQuestionDetails(q.id)}
                                                        variant='secondary'
                                                        className='px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500'
                                                    >
                                                        <Play size={16}/> View Details
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleOpenManualAnswers(q.id, q.question_text)}
                                                        variant='secondary'
                                                        className='px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                                                    >
                                                        <Edit size={16}/> Manual Answers
                                                    </Button>
                                                    {q.is_approved ? (
                                                        <Button
                                                            onClick={() => handleUnapproveEndedQuestion(q.id)}
                                                            variant='secondary'
                                                            className='px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white'
                                                        >
                                                            👁️‍🗨️ Hide from Homepage
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            onClick={() => handleApproveEndedQuestion(q.id)}
                                                            variant='secondary'
                                                            className='px-3 py-2 bg-green-600 hover:bg-green-700 text-white'
                                                        >
                                                            ✅ Approve for Homepage
                                                        </Button>
                                                    )}
                                                    <Button
                                                        onClick={() => handleDeleteQuestion(q.id)}
                                                        variant='danger'
                                                        className='px-3 py-2'
                                                    >
                                                        <Trash2 size={16}/> Delete
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className='text-slate-400'>No ended questions yet.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pending Questions */}
                    <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-white">Pending Questions</h2>
                        <ul className="space-y-3">
                            {pendingQuestions.map(q => (
                                <li key={q.id} className="flex items-center justify-between p-3 bg-slate-700/50 border border-slate-600 rounded-lg gap-2 mb-2">
                                    <span className="text-white flex-grow">{q.question_text}</span>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button onClick={() => {
                                            setEditingQuestion(q);
                                            setEditForm({
                                                text: q.question_text,
                                                imageUrl: q.image_url || '',
                                                answerType: (q as any).answer_type || 'general'
                                            });
                                            setEditSelectedFile(null);
                                            setEditImagePreview(null);
                                        }} variant='secondary' className='px-3 py-2'>
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
                    </div>
                </div>
            ) : view === 'suggestions' ? (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-2xl font-bold">Question Suggestions</h2>
                        <div className="text-sm text-slate-400">
                            Click "Make Live" to create and start a question directly from a suggestion
                        </div>
                    </div>

                    {renderSuggestions()}
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
                                <div key={suggestion.id} className="bg-slate-800/50 p-4">
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
                                                    {suggestion.users?.discord_user_id ? (
                                                        <button
                                                            onClick={() => navigateToUserProfile(suggestion.users.discord_user_id)}
                                                            className="text-sm text-slate-300 hover:text-purple-400 hover:underline transition-colors cursor-pointer"
                                                        >
                                                            {suggestion.users.username || 'Unknown User'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-sm text-slate-300">
                                                            {suggestion.users?.username || 'Unknown User'}
                                                        </span>
                                                    )}
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
                                                    <p className="text-sm text-slate-300 bg-slate-900/50 p-3">
                                                        "{suggestion.description}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => openConversionModal(suggestion)}
                                                className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
                                            >
                                                <CheckCircle size={14} className="mr-1" />
                                                Convert
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => deleteHighlightSuggestion(suggestion.id)}
                                                className="bg-red-600/20 hover:bg-red-600/30 text-red-300"
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
                        <h2 className="text-2xl font-bold">User Data</h2>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-400">
                                Showing {filteredUsers.length} of {userData.length} users
                            </div>
                            <Button
                                onClick={exportUserDataToCSV}
                                variant="secondary"
                                className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
                                disabled={filteredUsers.length === 0}
                            >
                                <Download size={16} /> Export CSV
                            </Button>
                        </div>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-800/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search username, discord ID..."
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 text-white placeholder-slate-400 focus:bg-slate-800/50 focus:outline-none"
                            />
                        </div>

                        <div>
                            <select
                                value={userRoleFilter}
                                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-900/50 text-white focus:bg-slate-800/50 focus:outline-none"
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
                                    setUserSearchTerm('');
                                    setUserRoleFilter('all');
                                }}
                                variant="secondary"
                                className="w-full"
                            >
                                <X size={16} /> Clear Filters
                            </Button>
                        </div>
                    </div>

                    {userData.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No user data available yet.</p>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No users match your current filters.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-800/30">
                                        <th className="text-left p-3 font-semibold text-slate-300">Username</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">User Discord ID</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">Role</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">Total Score</th>
                                        <th className="text-left p-3 font-semibold text-slate-300">Number of Question Answered</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user, index) => (
                                        <tr key={user.user_id} className={`${index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'}`}>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => navigateToUserProfile(user.discord_id)}
                                                    className="text-slate-200 font-medium hover:text-purple-400 hover:underline transition-colors cursor-pointer"
                                                >
                                                    {user.username}
                                                </button>
                                            </td>
                                            <td className="p-3 text-slate-300">
                                                {user.discord_id}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    user.discord_role === 'Admin' ? 'bg-red-900/50 text-red-300' :
                                                    user.discord_role === 'Full Access' ? 'bg-purple-900/50 text-purple-300' :
                                                    user.discord_role === 'NADSOG' ? 'bg-blue-900/50 text-blue-300' :
                                                    user.discord_role === 'Mon' ? 'bg-green-900/50 text-green-300' :
                                                    user.discord_role === 'Nads' ? 'bg-yellow-900/50 text-yellow-300' :
                                                    'bg-slate-700/50 text-slate-300'
                                                }`}>
                                                    {user.discord_role || 'No Role'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-slate-100 font-bold text-lg">
                                                    {user.total_score}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-slate-200 font-medium">
                                                    {user.questions_answered}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            ) : view === 'highlights-data' ? (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-2xl font-bold">Highlights Data - All Highlights</h2>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-400">
                                Showing {allTimeHighlights.length} highlights
                            </div>
                            <Button
                                onClick={() => {
                                    // Function to extract X username from Twitter URL
                                    const extractXUsername = (url: string): string => {
                                        try {
                                            const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
                                            return match ? match[1] : 'Unknown';
                                        } catch {
                                            return 'Unknown';
                                        }
                                    };

                                    const csvContent = [
                                        ['Date/Time', 'Title', 'Category', 'Media Type', 'Media URL', 'Embedded Link', 'X Username', 'Suggested By', 'Status'],
                                        ...allTimeHighlights.map(highlight => {
                                            // Extract suggested by info from description
                                            const suggestedByMatch = highlight.description?.match(/\[Suggested by: ([^\]]+)\]/);
                                            const suggestedBy = suggestedByMatch ? suggestedByMatch[1] : '';

                                            return [
                                                new Date(highlight.created_at).toLocaleString(),
                                                highlight.title,
                                                highlight.category,
                                                highlight.media_type,
                                                highlight.media_url,
                                                highlight.embedded_link || '',
                                                highlight.embedded_link ? extractXUsername(highlight.embedded_link) : '',
                                                suggestedBy,
                                                'Live'
                                            ];
                                        })
                                    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `highlights-data-${new Date().toISOString().split('T')[0]}.csv`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                }}
                                variant="secondary"
                                className="bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500"
                                disabled={allTimeHighlights.length === 0}
                            >
                                <Download size={16} /> Export CSV
                            </Button>
                        </div>
                    </div>

                    {allTimeHighlights.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-400 mb-4">No highlights data available.</p>
                            <p className="text-slate-500 text-sm">
                                Highlights will appear here once they are added through the all-time highlights panel or approved from suggestions.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-800/30">
                                        <th className="text-left p-3 text-slate-300 font-medium">Date/Time</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">Title</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">Category</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">Media Type</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">Media URL</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">Embedded Link</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">X Username</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">Suggested By</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">Status</th>
                                        <th className="text-left p-3 text-slate-300 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTimeHighlights.map(highlight => {
                                        // Function to extract X username from Twitter URL
                                        const extractXUsername = (url: string): string => {
                                            try {
                                                const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
                                                return match ? match[1] : 'Unknown';
                                            } catch {
                                                return 'Unknown';
                                            }
                                        };

                                        return (
                                            <tr key={highlight.id} className="hover:bg-slate-800/30">
                                                <td className="p-3 text-slate-300">
                                                    {new Date(highlight.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-3 text-slate-300 font-medium">
                                                    {highlight.title}
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded-full text-xs capitalize">
                                                        {highlight.category}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full text-xs uppercase">
                                                        {highlight.media_type}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <a
                                                        href={highlight.media_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:text-blue-300 underline break-all text-xs"
                                                    >
                                                        {highlight.media_url.length > 50 ? `${highlight.media_url.substring(0, 50)}...` : highlight.media_url}
                                                    </a>
                                                </td>
                                                <td className="p-3">
                                                    {highlight.embedded_link ? (
                                                        <a
                                                            href={highlight.embedded_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-400 hover:text-blue-300 underline break-all text-xs"
                                                        >
                                                            {highlight.embedded_link.length > 30 ? `${highlight.embedded_link.substring(0, 30)}...` : highlight.embedded_link}
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-500">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-slate-300 font-medium">
                                                    {highlight.embedded_link ? `@${extractXUsername(highlight.embedded_link)}` : '-'}
                                                </td>
                                                <td className="p-3 text-slate-300">
                                                    {(() => {
                                                        // Extract suggested by info from description
                                                        const match = highlight.description?.match(/\[Suggested by: ([^\]]+)\]/);
                                                        return match ? match[1] : <span className="text-slate-500">-</span>;
                                                    })()}
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded-full text-xs">
                                                        Live
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => window.open(highlight.media_url, '_blank')}
                                                            className="text-xs"
                                                        >
                                                            View Media
                                                        </Button>
                                                        {highlight.embedded_link && (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => window.open(highlight.embedded_link!, '_blank')}
                                                                className="text-xs"
                                                            >
                                                                View Link
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            ) : view === 'featured-highlights' ? (
                <FeaturedHighlightsManager showAllHighlights={false} />
            ) : view === 'alltime-highlights' ? (
                <AllTimeCommunityHighlightsManager />
            ) : view === 'events-tasks' ? (
                <EventTaskManager />
            ) : view === 'bulk-links' ? (
                <BulkLinkManager />
            ) : view === 'link-analytics' ? (
                <LinkAnalytics />
            ) : null
        )}


      
      {/* Edit Question Modal */}
        {editingQuestion && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingQuestion(null)}
          >
            <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4 text-white">Edit Question</h2>
              <form onSubmit={handleUpdateQuestion} className="space-y-4">
                  <input
                    type="text"
                    value={editForm.text}
                    onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                    placeholder="Question text..."
                    className="w-full bg-slate-900/50 px-4 py-3 text-white focus:bg-slate-800/50 focus:outline-none"
                    required
                  />
                  {/* Image Upload Section */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300">
                      Question Image (Optional)
                    </label>

                    {/* File Upload */}
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditFileChange}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                      />
                      <p className="text-xs text-slate-400">Upload an image file (max 10MB)</p>
                    </div>

                    {/* OR divider */}
                    <div className="flex items-center">
                      <div className="flex-1 border-t border-slate-600"></div>
                      <span className="px-3 text-sm text-slate-400">OR</span>
                      <div className="flex-1 border-t border-slate-600"></div>
                    </div>

                    {/* URL Input */}
                    <input
                      type="text"
                      value={editForm.imageUrl}
                      onChange={(e) => setEditForm({...editForm, imageUrl: e.target.value})}
                      placeholder="Image URL..."
                      className="w-full bg-slate-900/50 px-4 py-3 text-white focus:bg-slate-800/50 focus:outline-none"
                      disabled={!!editSelectedFile}
                    />

                    {/* Image Preview */}
                    {(editImagePreview || editForm.imageUrl) && (
                      <div className="relative">
                        <img
                          src={editImagePreview || editForm.imageUrl}
                          alt="Preview"
                          className="max-w-xs max-h-48 rounded-lg border border-slate-600"
                        />
                        <button
                          type="button"
                          onClick={removeEditImage}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Answer Type Selection */}
                  <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-300">
                          Expected Answer Type
                      </label>
                      <div className="flex gap-4">
                          <label className="flex items-center cursor-pointer">
                              <input
                                  type="radio"
                                  name="editAnswerType"
                                  value="general"
                                  checked={editForm.answerType === 'general'}
                                  onChange={(e) => setEditForm({...editForm, answerType: e.target.value as 'general'})}
                                  className="mr-2 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-slate-300">General Answer</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                              <input
                                  type="radio"
                                  name="editAnswerType"
                                  value="username"
                                  checked={editForm.answerType === 'username'}
                                  onChange={(e) => setEditForm({...editForm, answerType: e.target.value as 'username'})}
                                  className="mr-2 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-slate-300">Username Answer</span>
                          </label>
                      </div>
                  </div>
                  <div className="flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={() => setEditingQuestion(null)}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
                  </div>
              </form>
            </div>
          </div>
        )}



      {/* Manual Answers Modal */}
        {manualAnswersModal && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setManualAnswersModal(null)}
          >
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4 text-white">Set Manual Top 8 Answers</h2>
              <p className="text-slate-300 mb-4">Question: <span className="font-semibold">{manualAnswersModal.questionText}</span></p>

              <form onSubmit={handleSubmitManualAnswers} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {manualAnswers.map((answer, index) => (
                    <div key={index} className="bg-slate-800/50 p-4">
                      <h4 className="font-medium text-white mb-2">Answer #{index + 1}</h4>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={answer.group_text}
                          onChange={(e) => updateManualAnswer(index, 'group_text', e.target.value)}
                          placeholder={`Answer ${index + 1} text...`}
                          className="w-full bg-slate-900/50 px-3 py-2 text-white focus:bg-slate-800/50 focus:outline-none"
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
                            className="w-24 bg-slate-900/50 px-3 py-2 text-white focus:bg-slate-800/50 focus:outline-none"
                          />
                          <span className="text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/50 p-3">
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
            </div>
          </div>
        )}

      {/* Question Details Overlay */}
      {selectedQuestionId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white">📊 Question Response Data Sheet</h2>
              <Button
                onClick={closeQuestionDetails}
                variant="secondary"
                className="p-2"
              >
                <X size={20} />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {isLoadingDetails ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <div>
                  {/* Question Info */}
                  <div className="mb-6 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">Question:</h3>
                    <p className="text-slate-300 mb-4">
                      {liveQuestions.find(q => q.id === selectedQuestionId)?.question_text ||
                       endedQuestions.find(q => q.id === selectedQuestionId)?.question_text}
                    </p>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-400">{questionDetails.length}</div>
                        <div className="text-xs text-slate-400">Total Responses</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {new Set(questionDetails.map(d => d.user_id)).size}
                        </div>
                        <div className="text-xs text-slate-400">Unique Users</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {questionDetails.filter(d => d.discord_role).length}
                        </div>
                        <div className="text-xs text-slate-400">With Roles</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {questionDetails.length > 0 ? Math.round(questionDetails.reduce((sum, d) => sum + d.total_score, 0) / questionDetails.length) : 0}
                        </div>
                        <div className="text-xs text-slate-400">Avg Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Data Sheet - User Responses Table */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white mb-4">Response Data Sheet</h3>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-400">
                          {questionDetails.length} Total Responses
                        </div>
                        {questionDetails.length > 0 && (
                          <Button
                            onClick={() => {
                              const question = liveQuestions.find(q => q.id === selectedQuestionId) ||
                                               endedQuestions.find(q => q.id === selectedQuestionId);
                              const csvContent = [
                                ['#', 'Username', 'Discord ID', 'Role', 'Score', 'Response'].join(','),
                                ...questionDetails.map((detail, index) => [
                                  index + 1,
                                  `"${detail.username}"`,
                                  detail.discord_id,
                                  `"${detail.discord_role || 'No Role'}"`,
                                  detail.total_score,
                                  `"${detail.answer_text.replace(/"/g, '""')}"`,
                                ].join(','))
                              ].join('\n');

                              const blob = new Blob([csvContent], { type: 'text/csv' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `question-responses-${question?.question_text.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                            }}
                            variant="secondary"
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm"
                          >
                            📊 Export CSV
                          </Button>
                        )}
                      </div>
                    </div>

                    {questionDetails.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full bg-slate-800/50 border border-slate-600 rounded-lg">
                          <thead>
                            <tr className="bg-slate-700/50 border-b border-slate-600">
                              <th className="text-left p-4 text-white font-semibold">#</th>
                              <th className="text-left p-4 text-white font-semibold">User</th>
                              <th className="text-left p-4 text-white font-semibold">Username</th>
                              <th className="text-left p-4 text-white font-semibold">Discord ID</th>
                              <th className="text-left p-4 text-white font-semibold">Role</th>
                              <th className="text-left p-4 text-white font-semibold">Score</th>
                              <th className="text-left p-4 text-white font-semibold">Response</th>
                            </tr>
                          </thead>
                          <tbody>
                            {questionDetails.map((detail, index) => (
                              <tr key={detail.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                                <td className="p-4 text-slate-300 font-mono text-sm">
                                  {index + 1}
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    {detail.avatar_url ? (
                                      <img
                                        src={detail.avatar_url}
                                        alt={detail.username}
                                        className="w-8 h-8 rounded-full"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-purple-600 flex items-center justify-center rounded-full">
                                        <span className="text-xs text-white font-semibold">
                                          {detail.username.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-white font-medium">
                                  <button
                                    onClick={() => navigateToUserProfile(detail.discord_id)}
                                    className="hover:text-purple-400 hover:underline transition-colors cursor-pointer"
                                  >
                                    {detail.username}
                                  </button>
                                </td>
                                <td className="p-4 text-slate-300 font-mono text-sm">
                                  {detail.discord_id}
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    detail.discord_role
                                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                                      : 'bg-slate-600/20 text-slate-400 border border-slate-500/30'
                                  }`}>
                                    {detail.discord_role || 'No Role'}
                                  </span>
                                </td>
                                <td className="p-4 text-slate-300 font-semibold">
                                  {detail.total_score}
                                </td>
                                <td className="p-4 max-w-xs">
                                  <div className="text-white bg-slate-900/50 border border-slate-600 rounded p-2 text-sm">
                                    <span className="line-clamp-2">"{detail.answer_text}"</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400 bg-slate-800/30 border border-slate-600 rounded-lg">
                        <div className="text-4xl mb-4">📊</div>
                        <h4 className="text-lg font-semibold mb-2">No Response Data</h4>
                        <p>No users have answered this question yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggestion to Question Modal */}
      {selectedSuggestion && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSuggestion(null)}
        >
          <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-white">Create Live Question from Suggestion</h2>
            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400">Original suggestion by {selectedSuggestion.users?.username || 'Anonymous'}:</p>
              <p className="text-slate-200 font-medium">{selectedSuggestion.text}</p>
            </div>

            <form onSubmit={handleCreateQuestionFromSuggestion} className="space-y-4">
              <input
                type="text"
                value={suggestionForm.text}
                onChange={(e) => setSuggestionForm({...suggestionForm, text: e.target.value})}
                placeholder="Question text..."
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                required
              />

              {/* Image Upload Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Question Image (Optional)
                </label>

                {/* File Upload */}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSuggestionFileChange}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                  />
                  <p className="text-xs text-slate-400">Upload an image file (max 10MB)</p>
                </div>

                {/* OR divider */}
                <div className="flex items-center">
                  <div className="flex-1 border-t border-slate-600"></div>
                  <span className="px-3 text-sm text-slate-400">OR</span>
                  <div className="flex-1 border-t border-slate-600"></div>
                </div>

                {/* URL Input */}
                <input
                  type="text"
                  value={suggestionForm.imageUrl}
                  onChange={(e) => setSuggestionForm({...suggestionForm, imageUrl: e.target.value})}
                  placeholder="Image URL..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                  disabled={!!suggestionSelectedFile}
                />

                {/* Image Preview */}
                {(suggestionImagePreview || suggestionForm.imageUrl) && (
                  <div className="relative">
                    <img
                      src={suggestionImagePreview || suggestionForm.imageUrl}
                      alt="Preview"
                      className="max-w-xs max-h-48 rounded-lg border border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={removeSuggestionImage}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Answer Type Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Expected Answer Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="suggestionAnswerType"
                      value="general"
                      checked={suggestionForm.answerType === 'general'}
                      onChange={(e) => setSuggestionForm({...suggestionForm, answerType: e.target.value as 'general'})}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-300">General Answer</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="suggestionAnswerType"
                      value="username"
                      checked={suggestionForm.answerType === 'username'}
                      onChange={(e) => setSuggestionForm({...suggestionForm, answerType: e.target.value as 'username'})}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-300">Username Answer</span>
                  </label>
                </div>
                <p className="text-xs text-slate-400">
                  {suggestionForm.answerType === 'username'
                    ? 'Participants will be expected to answer with a username or person\'s name.'
                    : 'Participants can answer with any text, number, or general response.'
                  }
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setSelectedSuggestion(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                  {isSubmitting ? 'Creating...' : 'Create & Make Live'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {/* Highlight Conversion Modal */}
      {showConversionModal && convertingSuggestion && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConversionModal(false)}
        >
          <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-white">Convert Highlight Suggestion</h2>
            <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">
                <strong>Suggested by:</strong> {convertingSuggestion.users?.username || 'Anonymous'}
              </p>
              <p className="text-sm text-slate-300 mb-2">
                <strong>Twitter URL:</strong>
                <a href={convertingSuggestion.twitter_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2">
                  {convertingSuggestion.twitter_url}
                </a>
              </p>
              {convertingSuggestion.description && (
                <p className="text-sm text-slate-300">
                  <strong>Description:</strong> {convertingSuggestion.description}
                </p>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); convertToHighlight(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={conversionForm.title}
                  onChange={(e) => setConversionForm({...conversionForm, title: e.target.value})}
                  className="w-full bg-slate-900/50 px-4 py-3 text-white focus:bg-slate-800/50 focus:outline-none rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={conversionForm.description}
                  onChange={(e) => setConversionForm({...conversionForm, description: e.target.value})}
                  className="w-full bg-slate-900/50 px-4 py-3 text-white focus:bg-slate-800/50 focus:outline-none rounded-lg"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  <select
                    value={conversionForm.category}
                    onChange={(e) => setConversionForm({...conversionForm, category: e.target.value as any})}
                    className="w-full bg-slate-900/50 px-4 py-3 text-white focus:bg-slate-800/50 focus:outline-none rounded-lg"
                  >
                    <option value="gaming">Gaming</option>
                    <option value="community">Community</option>
                    <option value="events">Events</option>
                    <option value="achievements">Achievements</option>
                    <option value="memories">Memories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Media Type</label>
                  <select
                    value={conversionForm.media_type}
                    onChange={(e) => setConversionForm({...conversionForm, media_type: e.target.value as any})}
                    className="w-full bg-slate-900/50 px-4 py-3 text-white focus:bg-slate-800/50 focus:outline-none rounded-lg"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="gif">GIF</option>
                  </select>
                </div>
              </div>

              {/* Media Upload Section */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Media</label>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="uploadMethod"
                        value="file"
                        checked={conversionForm.uploadMethod === 'file'}
                        onChange={(e) => setConversionForm({...conversionForm, uploadMethod: e.target.value as any})}
                        className="mr-2"
                      />
                      Upload File
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="uploadMethod"
                        value="url"
                        checked={conversionForm.uploadMethod === 'url'}
                        onChange={(e) => setConversionForm({...conversionForm, uploadMethod: e.target.value as any})}
                        className="mr-2"
                      />
                      Use URL
                    </label>
                  </div>

                  {conversionForm.uploadMethod === 'file' ? (
                    <div>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleConversionFileChange}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                      />
                      {conversionPreview && (
                        <div className="mt-2">
                          <img src={conversionPreview} alt="Preview" className="max-w-full h-32 object-cover rounded-lg" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="url"
                      value={conversionForm.media_url}
                      onChange={(e) => setConversionForm({...conversionForm, media_url: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                      className="w-full bg-slate-900/50 px-4 py-3 text-white focus:bg-slate-800/50 focus:outline-none rounded-lg"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowConversionModal(false)}
                  disabled={isConverting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isConverting || (!conversionFile && !conversionForm.media_url)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isConverting ? 'Converting...' : 'Convert to Highlight'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}



            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
