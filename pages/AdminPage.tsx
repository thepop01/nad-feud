import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { supaclient } from '../services/supabase';
import { Question, Suggestion } from '../types';
import { PlusCircle, Trash2, Play, User as UserIcon, UploadCloud, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type SuggestionWithUser = Suggestion & { users: { username: string | null; avatar_url: string | null; } | null };

const AdminPage: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [view, setView] = useState<'manage' | 'suggestions'>('manage');
  
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionWithUser[]>([]);
  
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [pQuestions, suggs] = await Promise.all([
          supaclient.getPendingQuestions(),
          supaclient.getSuggestions(),
        ]);
        setPendingQuestions(pQuestions);
        setSuggestions(suggs as SuggestionWithUser[]);
    } catch(error) {
        console.error("Failed to fetch admin data:", error);
        alert("Could not load admin data.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);
  
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
    
    let finalImageUrl: string | null = newQuestionImage || null;

    if (selectedFile) {
        try {
            finalImageUrl = await supaclient.uploadQuestionImage(selectedFile, user.id);
        } catch (error) {
            console.error("Image upload failed:", error);
            alert("Image upload failed. Please try again.");
            setIsSubmitting(false);
            return;
        }
    }

    await supaclient.createQuestion(newQuestionText, finalImageUrl);
    setNewQuestionText('');
    setNewQuestionImage('');
    removeImage();
    setIsSubmitting(false);
    fetchData();
  };

  const handleStartQuestion = async (id: string) => {
    await supaclient.startQuestion(id);
    alert('Question is now live! Previous live question (if any) has been ended.');
    fetchData();
  };
  
  const handleEndQuestion = async (id: string) => {
    alert('Ending question... This will trigger AI grouping and scoring in the background.');
    await supaclient.endQuestion(id);
    fetchData();
  };

  const handleDeleteSuggestion = async (id:string) => {
    await supaclient.deleteSuggestion(id);
    fetchData();
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const TabButton: React.FC<{currentView: string; viewName: string; setView: (view: any) => void; children: React.ReactNode}> = ({currentView, viewName, setView, children}) => (
    <button onClick={() => setView(viewName)} className={`px-4 py-2 text-lg font-semibold rounded-t-lg transition-colors ${currentView === viewName ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:text-white'}`}>
        {children}
    </button>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-center">Admin Panel</h1>
      
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
      
      <div className="flex border-b border-slate-700">
          <TabButton currentView={view} viewName="manage" setView={setView}>Manage Questions</TabButton>
          <TabButton currentView={view} viewName="suggestions" setView={setView}>Suggestions ({suggestions.length})</TabButton>
      </div>

      <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isLoading ? <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div> : (
            view === 'manage' ? (
                <Card>
                    <h2 className="text-2xl font-bold mb-4">Pending Questions</h2>
                    <ul className="space-y-3">
                        {pendingQuestions.map(q => (
                            <li key={q.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                <span className="text-slate-200">{q.question_text}</span>
                                <div className="flex gap-2">
                                    <Button onClick={() => handleStartQuestion(q.id)} variant='secondary'>
                                        <Play size={16}/> Start
                                    </Button>
                                </div>
                            </li>
                        ))}
                        {pendingQuestions.length === 0 && <p className='text-slate-400'>No pending questions.</p>}
                    </ul>
                </Card>
            ) : (
                <Card>
                    <h2 className="text-2xl font-bold mb-4">User Suggestions</h2>
                    <ul className="space-y-3">
                        {suggestions.map(s => (
                            <li key={s.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {s.users?.avatar_url ? (
                                      <img src={s.users.avatar_url} alt={s.users.username || 'user avatar'} className="w-8 h-8 rounded-full"/>
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                                          <UserIcon size={16} className="text-slate-400" />
                                      </div>
                                    )}
                                    <div>
                                        <p className="text-slate-200">{s.text}</p>
                                        <p className="text-xs text-slate-400">by {s.users?.username || 'Anonymous'}</p>
                                    </div>
                                </div>
                                <Button onClick={() => handleDeleteSuggestion(s.id)} variant="danger" className='px-3 py-2'>
                                    <Trash2 size={16}/>
                                </Button>
                            </li>
                        ))}
                         {suggestions.length === 0 && <p className='text-slate-400'>No user suggestions.</p>}
                    </ul>
                </Card>
            )
        )}
      </motion.div>
      </AnimatePresence>

    </div>
  );
};

export default AdminPage;
