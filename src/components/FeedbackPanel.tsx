'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
  MessageCircle,
  Eye,
  BookOpen,
  Star,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { getWriterProfile, getStyleProfile, getWritingRules } from '@/lib/personalization';
import styles from './FeedbackPanel.module.css';

// ============================================================================
// Types
// ============================================================================

interface FeedbackResponse {
  pacing: {
    rating: 'slow' | 'balanced' | 'fast';
    notes: string;
  };
  tension: {
    rating: number; // 1-10
    arcDescription: string;
  };
  dialogue: {
    quality: number; // 1-10
    issues: string[];
  };
  povConsistency: {
    status: 'consistent' | 'inconsistent';
    issues: string[];
  };
  showDontTell: {
    violations: Array<{
      quote: string;
      suggestion: string;
    }>;
  };
  strengths: string[];
  priorities: string[];
}

interface ExpandedSections {
  [key: string]: boolean;
}

// ============================================================================
// FeedbackPanel Component
// ============================================================================

interface FeedbackPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackPanel = ({ isOpen, onClose }: FeedbackPanelProps) => {
  const { currentChapter, chapterScenes, currentProject } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ExpandedSections>({
    pacing: true,
    tension: true,
    dialogue: true,
    pov: true,
    showDontTell: true,
    strengths: true,
    priorities: true,
  });

  const toggleSection = useCallback((section: string) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const fetchFeedback = useCallback(async () => {
    if (!currentChapter || !currentProject) {
      setError('No chapter selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFeedback(null);

    try {
      // Get all scenes for this chapter
      const scenes = chapterScenes(currentChapter.id);

      // Concatenate all scene content as HTML
      const chapterContent = scenes
        .map((scene) => scene.content)
        .join('\n\n');

      // Call the API
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterTitle: currentChapter.title,
          chapterContent,
          genre: currentProject.genre,
          writerProfile: getWriterProfile(),
          styleProfile: getStyleProfile(currentProject.id),
          writingRules: getWritingRules(currentProject.id),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setFeedback(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch feedback'
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentChapter, currentProject, chapterScenes]);

  if (!isOpen) return null;

  return (
    <div className={styles.panelOverlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Chapter Feedback</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close feedback panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {!feedback && !isLoading && !error && (
            <div className={styles.empty}>
              <p className={styles.emptyText}>
                Ready for AI feedback on your chapter?
              </p>
              <button
                onClick={fetchFeedback}
                className={styles.getFeedbackButton}
              >
                Get Feedback
              </button>
            </div>
          )}

          {isLoading && (
            <div className={styles.loading}>
              <div className={styles.shimmer}></div>
              <div className={styles.shimmer}></div>
              <div className={styles.shimmer}></div>
              <p className={styles.loadingText}>
                <Loader2 className={styles.spinner} />
                Analyzing your chapter...
              </p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <p className={styles.errorText}>{error}</p>
              <button
                onClick={fetchFeedback}
                className={styles.retryButton}
              >
                Try Again
              </button>
            </div>
          )}

          {feedback && (
            <div className={styles.feedbackContainer}>
              {/* Pacing Section */}
              <Section
                title="Pacing"
                icon={Activity}
                isExpanded={expanded.pacing}
                onToggle={() => toggleSection('pacing')}
              >
                <div className={styles.sectionContent}>
                  <div className={styles.ratingBadge}>
                    <span
                      className={`${styles.badge} ${styles[`badge-${feedback.pacing.rating}`]}`}
                    >
                      {feedback.pacing.rating.charAt(0).toUpperCase() +
                        feedback.pacing.rating.slice(1)}
                    </span>
                  </div>
                  <p className={styles.notesText}>{feedback.pacing.notes}</p>
                </div>
              </Section>

              {/* Tension Section */}
              <Section
                title="Tension"
                icon={Zap}
                isExpanded={expanded.tension}
                onToggle={() => toggleSection('tension')}
              >
                <div className={styles.sectionContent}>
                  <div className={styles.ratingBar}>
                    <div className={styles.barLabel}>
                      <span>Tension Level</span>
                      <span className={styles.ratingNumber}>
                        {feedback.tension.rating}/10
                      </span>
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progress}
                        style={{
                          width: `${feedback.tension.rating * 10}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <p className={styles.notesText}>
                    {feedback.tension.arcDescription}
                  </p>
                </div>
              </Section>

              {/* Dialogue Section */}
              <Section
                title="Dialogue"
                icon={MessageCircle}
                isExpanded={expanded.dialogue}
                onToggle={() => toggleSection('dialogue')}
              >
                <div className={styles.sectionContent}>
                  <div className={styles.qualityRating}>
                    <span className={styles.ratingLabel}>Quality</span>
                    <div className={styles.stars}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={`${styles.star} ${i < feedback.dialogue.quality ? styles.filled : ''}`}
                        />
                      ))}
                    </div>
                    <span className={styles.ratingNumber}>
                      {feedback.dialogue.quality}/10
                    </span>
                  </div>
                  {feedback.dialogue.issues.length > 0 && (
                    <div className={styles.issuesList}>
                      <p className={styles.issuesLabel}>Issues:</p>
                      <ul>
                        {feedback.dialogue.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Section>

              {/* POV Consistency Section */}
              <Section
                title="POV Consistency"
                icon={Eye}
                isExpanded={expanded.pov}
                onToggle={() => toggleSection('pov')}
              >
                <div className={styles.sectionContent}>
                  <div className={styles.ratingBadge}>
                    <span
                      className={`${styles.badge} ${styles[`badge-${feedback.povConsistency.status === 'consistent' ? 'balanced' : 'fast'}`]}`}
                    >
                      {feedback.povConsistency.status
                        .charAt(0)
                        .toUpperCase() +
                        feedback.povConsistency.status.slice(1)}
                    </span>
                  </div>
                  {feedback.povConsistency.issues.length > 0 && (
                    <div className={styles.issuesList}>
                      <p className={styles.issuesLabel}>Issues:</p>
                      <ul>
                        {feedback.povConsistency.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Section>

              {/* Show Don't Tell Section */}
              <Section
                title="Show Don't Tell"
                icon={BookOpen}
                isExpanded={expanded.showDontTell}
                onToggle={() => toggleSection('showDontTell')}
              >
                <div className={styles.sectionContent}>
                  {feedback.showDontTell.violations.length === 0 ? (
                    <p className={styles.successText}>
                      Great job showing rather than telling!
                    </p>
                  ) : (
                    <div className={styles.violationsList}>
                      {feedback.showDontTell.violations.map((violation, idx) => (
                        <div key={idx} className={styles.violationCard}>
                          <blockquote className={styles.quote}>
                            "{violation.quote}"
                          </blockquote>
                          <div className={styles.suggestion}>
                            <p className={styles.suggestionLabel}>
                              Suggestion:
                            </p>
                            <p>{violation.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              {/* Strengths Section */}
              <Section
                title="Strengths"
                icon={Star}
                isExpanded={expanded.strengths}
                onToggle={() => toggleSection('strengths')}
              >
                <div className={styles.sectionContent}>
                  <ul className={styles.strengthsList}>
                    {feedback.strengths.map((strength, idx) => (
                      <li key={idx} className={styles.strengthItem}>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>

              {/* Priorities Section */}
              <Section
                title="Priorities"
                icon={AlertTriangle}
                isExpanded={expanded.priorities}
                onToggle={() => toggleSection('priorities')}
              >
                <div className={styles.sectionContent}>
                  <ol className={styles.prioritiesList}>
                    {feedback.priorities.map((priority, idx) => (
                      <li key={idx} className={styles.priorityItem}>
                        {priority}
                      </li>
                    ))}
                  </ol>
                </div>
              </Section>
            </div>
          )}
        </div>

        {feedback && (
          <div className={styles.footer}>
            <button
              onClick={fetchFeedback}
              className={styles.refreshButton}
              disabled={isLoading}
            >
              Refresh Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Section Component (Collapsible)
// ============================================================================

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Section = ({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
}: SectionProps) => {
  return (
    <div className={styles.section}>
      <button
        onClick={onToggle}
        className={styles.sectionHeader}
        aria-expanded={isExpanded}
      >
        <div className={styles.sectionTitleWrap}>
          <Icon size={18} className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronDown size={18} className={styles.chevron} />
        ) : (
          <ChevronRight size={18} className={styles.chevron} />
        )}
      </button>
      {isExpanded && children}
    </div>
  );
};

// ============================================================================
// FeedbackTrigger Button Component
// ============================================================================

interface FeedbackTriggerProps {
  onClick?: () => void;
  className?: string;
}

export const FeedbackTrigger = ({
  onClick,
  className = '',
}: FeedbackTriggerProps) => {
  return (
    <button
      onClick={onClick}
      className={`${styles.triggerButton} ${className}`}
      aria-label="Get AI feedback on chapter"
      title="Get AI feedback on this chapter"
    >
      <Zap size={18} />
      <span>Get Feedback</span>
    </button>
  );
};
