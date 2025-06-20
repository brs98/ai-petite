'use client';

import { RecipeCard } from '@/components/recipes/RecipeCard/RecipeCard';
import { GenerationProgress } from '@/components/recipes/RecipeGenerator/GenerationProgress';
import { GeneratorForm } from '@/components/recipes/RecipeGenerator/GeneratorForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type NutritionProfile,
  type Recipe,
  type RecipeGenerationRequest,
} from '@/types/recipe';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type GenerationStage =
  | 'initializing'
  | 'generating'
  | 'validating'
  | 'complete';

export default function RecipeGeneratePage() {
  const router = useRouter();
  const [nutritionProfile, setNutritionProfile] =
    useState<NutritionProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] =
    useState<GenerationStage>('initializing');
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] =
    useState<RecipeGenerationRequest | null>(null);

  // Load nutrition profile on mount
  useEffect(() => {
    void loadNutritionProfile();
  }, []);

  const loadNutritionProfile = async () => {
    try {
      const response = await fetch('/api/nutrition/profile');
      if (response.ok) {
        const profile = await response.json();
        setNutritionProfile(profile);
      } else if (response.status === 401) {
        router.push('/login');
        return;
      }
      // If 404, profile doesn't exist yet - that's ok
    } catch (error) {
      console.error('Error loading nutrition profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const simulateGenerationStages = useCallback(async () => {
    const stages: GenerationStage[] = [
      'initializing',
      'generating',
      'validating',
      'complete',
    ];

    for (let i = 0; i < stages.length; i++) {
      setGenerationStage(stages[i]);

      // Simulate different timing for each stage
      const delays = [800, 2000, 1000, 500];
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }, []);

  const handleGenerate = async (request: RecipeGenerationRequest) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedRecipe(null);
    setLastRequest(request);

    try {
      // Start the stage simulation
      const stagePromise = simulateGenerationStages();

      // Make the actual API call
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // Wait for both the API call and stage simulation to complete
      await Promise.all([response, stagePromise]);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate recipe');
      }

      const data = await response.json();
      setGeneratedRecipe(data.recipe);
    } catch (error) {
      console.error('Recipe generation error:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to generate recipe',
      );
    } finally {
      setIsGenerating(false);
      setGenerationStage('initializing');
    }
  };

  const handleRegenerate = () => {
    if (lastRequest) {
      void handleGenerate(lastRequest);
    }
  };

  const handleSaveRecipe = async (recipeId: number) => {
    try {
      const response = await fetch('/api/recipes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId }),
      });

      if (response.ok) {
        // Update the recipe in state to reflect saved status
        setGeneratedRecipe(prev => (prev ? { ...prev, isSaved: true } : null));
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
    }
  };

  const handleViewRecipe = (recipeId: number) => {
    router.push(`/dashboard/recipes/${recipeId}`);
  };

  const handleSetupProfile = () => {
    router.push('/dashboard/settings/nutrition');
  };

  const handleStartOver = () => {
    setGeneratedRecipe(null);
    setError(null);
    setLastRequest(null);
  };

  if (isLoadingProfile) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center space-y-4'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
          <p className='text-muted-foreground'>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-6 space-y-8'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => router.push('/dashboard/recipes')}
          className='gap-2'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Recipes
        </Button>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <GenerationProgress
          isGenerating={isGenerating}
          stage={generationStage}
          message='Creating your perfect recipe...'
        />
      )}

      {/* Error State */}
      {error && !isGenerating && (
        <Card className='w-full max-w-2xl mx-auto border-destructive'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-destructive'>
              <AlertCircle className='h-5 w-5' />
              Recipe Generation Failed
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm text-muted-foreground'>{error}</p>
            <div className='flex gap-2'>
              <Button onClick={handleRegenerate} variant='default' size='sm'>
                <RefreshCw className='h-4 w-4 mr-2' />
                Try Again
              </Button>
              <Button onClick={handleStartOver} variant='outline' size='sm'>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Recipe */}
      {generatedRecipe && !isGenerating && (
        <div className='space-y-6'>
          <div className='text-center space-y-2'>
            <h2 className='text-2xl font-bold'>Your Recipe is Ready!</h2>
            <p className='text-muted-foreground'>
              Here's a personalized recipe based on your preferences.
            </p>
          </div>

          <div className='flex justify-center'>
            <RecipeCard
              recipe={generatedRecipe}
              onSave={recipeId => {
                void handleSaveRecipe(recipeId);
              }}
              onView={handleViewRecipe}
            />
          </div>

          <div className='flex justify-center gap-4'>
            <Button
              onClick={handleRegenerate}
              variant='outline'
              className='gap-2'
            >
              <RefreshCw className='h-4 w-4' />
              Generate Another
            </Button>
            <Button onClick={handleStartOver} variant='ghost'>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Generator Form */}
      {!isGenerating && !generatedRecipe && (
        <GeneratorForm
          onGenerate={request => {
            void handleGenerate(request);
          }}
          isGenerating={isGenerating}
          hasNutritionProfile={!!nutritionProfile}
          onSetupProfile={handleSetupProfile}
        />
      )}
    </div>
  );
}
