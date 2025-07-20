import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../components/Card';
import { supaclient } from '../services/supabase';
import { Question, GroupedAnswer } from '../types';

interface EndedQuestion {
  question: Question;
  groups: GroupedAnswer[];
}

const ProgressBar: React.FC<{ percentage: number; delay: number }> = ({ percentage, delay }) => (
    <div className="w-full bg-slate-700 rounded-full h-2.5">
        <motion.div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: delay + 0.5, ease: 'easeOut' }}
        ></motion.div>
    </div>
);


const EndedQuestionsPage: React.FC = () => {
  const [endedQuestions, setEndedQuestions] = useState<EndedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEndedQuestions = async () => {
      setIsLoading(true);
      const data = await supaclient.getEndedQuestions();
      setEndedQuestions(data);
      setIsLoading(false);
    };
    fetchEndedQuestions();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className="space-y-8"
    >
      <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text mb-8">
        Past Feuds
      </h1>
      {endedQuestions.length > 0 ? (
        endedQuestions.map(({ question, groups }, qIndex) => (
          <Card key={question.id} delay={qIndex * 0.1}>
            <div className="mb-4">
              {question.image_url && (
                 <img src={question.image_url} alt="Question visual" className="rounded-lg mx-auto max-h-48 mb-4 shadow-lg"/>
              )}
              <h2 className="text-2xl font-bold text-white">{question.question_text}</h2>
              <p className="text-sm text-slate-400">Asked on {new Date(question.created_at).toLocaleDateString()}</p>
            </div>
            <div className="space-y-4">
              {groups.map((group, index) => (
                <motion.div 
                    key={group.id} 
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + (qIndex * 0.1) }}
                >
                  <span className="font-bold text-xl text-purple-300 w-16 text-right">{group.percentage}%</span>
                  <div className="flex-grow">
                    <p className="text-lg text-slate-200">{group.group_text}</p>
                    <ProgressBar percentage={group.percentage} delay={index * 0.1 + (qIndex * 0.1)} />
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        ))
      ) : (
        <Card className="text-center">
          <p className="text-slate-400">No questions have ended yet.</p>
        </Card>
      )}
    </motion.div>
  );
};

export default EndedQuestionsPage;