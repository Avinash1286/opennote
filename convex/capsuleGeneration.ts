import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// =============================================================================
// MAIN GENERATION ACTION (Entry Point)
// =============================================================================

/**
 * Start capsule content generation
 * This is the main entry point called from the UI
 */
export const generateCapsuleContent = action({
  args: {
    capsuleId: v.id("capsules"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; generationId?: string; jobId?: string; error?: string }> => {
    // Get the capsule
    const capsule = await ctx.runQuery(api.capsules.getCapsule, {
      capsuleId: args.capsuleId,
    });

    if (!capsule) {
      throw new Error("Capsule not found");
    }

    if (capsule.status !== "pending" && capsule.status !== "failed") {
      return { success: false, error: "Capsule is already being generated or completed" };
    }

    // Generate unique job ID
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Create generation job
    const jobId: string = await ctx.runMutation(internal.capsules.createGenerationJob, {
      capsuleId: args.capsuleId,
      generationId,
    });

    // Update capsule status
    await ctx.runMutation(api.capsules.updateCapsuleStatus, {
      capsuleId: args.capsuleId,
      status: "generating_outline",
    });

    // Schedule the outline generation
    await ctx.scheduler.runAfter(0, internal.capsuleGeneration.generateOutline, {
      capsuleId: args.capsuleId,
      jobId: jobId as Id<"capsuleGenerationJobs">,
      generationId,
    });

    return { success: true, generationId, jobId };
  },
});

// =============================================================================
// STAGE 1: OUTLINE GENERATION
// =============================================================================

export const generateOutline = internalAction({
  args: {
    capsuleId: v.id("capsules"),
    jobId: v.id("capsuleGenerationJobs"),
    generationId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get capsule data
      const capsule = await ctx.runQuery(internal.capsules.getCapsuleForGeneration, {
        capsuleId: args.capsuleId,
      });

      if (!capsule) {
        throw new Error("Capsule not found");
      }

      // Build the prompt for outline generation
      const topic = capsule.sourceTopic || capsule.title;
      const guidance = capsule.userPrompt || "";

      // Call AI to generate outline
      const outlineResponse = await generateCapsuleOutlineAI(topic, guidance);

      // Check for error response from AI
      if (outlineResponse.error) {
        await ctx.runMutation(api.capsules.updateCapsuleStatus, {
          capsuleId: args.capsuleId,
          status: "failed",
          errorMessage: outlineResponse.message || "Content generation failed",
        });
        return;
      }

      // Parse and validate the outline
      const outline = outlineResponse;
      const totalModules = outline.modules?.length || 0;
      const totalLessons = outline.modules?.reduce(
        (sum: number, m: { lessons?: unknown[] }) => sum + (m.lessons?.length || 0),
        0
      ) || 0;

      // Update capsule with outline info
      await ctx.runMutation(api.capsules.updateCapsuleStatus, {
        capsuleId: args.capsuleId,
        status: "generating_content",
        description: outline.description,
        moduleCount: totalModules,
        lessonCount: totalLessons,
        estimatedDuration: outline.estimatedDuration || 30,
      });

      // Update job with outline
      await ctx.runMutation(internal.capsules.updateGenerationJob, {
        jobId: args.jobId,
        updates: {
          outlineGenerated: true,
          outlineJson: JSON.stringify(outline),
          totalModules,
          currentStage: "module_0",
        },
      });

      // Schedule content generation for first module
      if (totalModules > 0) {
        await ctx.scheduler.runAfter(0, internal.capsuleGeneration.generateModuleContent, {
          capsuleId: args.capsuleId,
          jobId: args.jobId,
          generationId: args.generationId,
          moduleIndex: 0,
          outline: JSON.stringify(outline),
        });
      } else {
        // No modules - mark as completed
        await ctx.runMutation(api.capsules.updateCapsuleStatus, {
          capsuleId: args.capsuleId,
          status: "completed",
        });
        await ctx.runMutation(internal.capsules.updateGenerationJob, {
          jobId: args.jobId,
          updates: {
            currentStage: "completed",
            completedAt: Date.now(),
          },
        });
      }
    } catch (error) {
      console.error("Outline generation failed:", error);
      await ctx.runMutation(api.capsules.updateCapsuleStatus, {
        capsuleId: args.capsuleId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      await ctx.runMutation(internal.capsules.updateGenerationJob, {
        jobId: args.jobId,
        updates: {
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  },
});

// =============================================================================
// STAGE 2: MODULE CONTENT GENERATION
// =============================================================================

export const generateModuleContent = internalAction({
  args: {
    capsuleId: v.id("capsules"),
    jobId: v.id("capsuleGenerationJobs"),
    generationId: v.string(),
    moduleIndex: v.number(),
    outline: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const outline = JSON.parse(args.outline);
      const moduleOutline = outline.modules[args.moduleIndex];

      if (!moduleOutline) {
        throw new Error(`Module ${args.moduleIndex} not found in outline`);
      }

      // Get capsule for context
      const capsule = await ctx.runQuery(internal.capsules.getCapsuleForGeneration, {
        capsuleId: args.capsuleId,
      });

      if (!capsule) {
        throw new Error("Capsule not found");
      }

      // Generate content for all lessons in this module
      const moduleContent = await generateModuleContentAI({
        topic: capsule.sourceTopic || capsule.title,
        capsuleTitle: outline.title,
        capsuleDescription: outline.description,
        moduleTitle: moduleOutline.title,
        moduleDescription: moduleOutline.description || "",
        moduleIndex: args.moduleIndex,
        lessons: moduleOutline.lessons || [],
      });

      // Save the module and its lessons to the database
      await ctx.runMutation(internal.capsules.saveGeneratedModule, {
        capsuleId: args.capsuleId,
        moduleData: {
          title: moduleContent.title || moduleOutline.title,
          description: moduleContent.description || moduleOutline.description,
          introduction: moduleContent.introduction,
          learningObjectives: moduleContent.learningObjectives,
          moduleSummary: moduleContent.moduleSummary,
          order: args.moduleIndex,
        },
        lessons: (moduleContent.lessons || []).map((lesson: { title?: string; description?: string; content?: unknown }, idx: number) => ({
          title: lesson.title || `Lesson ${idx + 1}`,
          description: lesson.description,
          order: idx,
          type: "mixed",
          content: lesson.content || lesson,
        })),
      });

      // Update job progress
      const nextModuleIndex = args.moduleIndex + 1;
      const isLastModule = nextModuleIndex >= outline.modules.length;

      await ctx.runMutation(internal.capsules.updateGenerationJob, {
        jobId: args.jobId,
        updates: {
          modulesGenerated: nextModuleIndex,
          currentModuleIndex: nextModuleIndex,
          currentStage: isLastModule ? "finalizing" : `module_${nextModuleIndex}`,
        },
      });

      if (isLastModule) {
        // All modules generated - finalize
        await ctx.scheduler.runAfter(0, internal.capsuleGeneration.finalizeGeneration, {
          capsuleId: args.capsuleId,
          jobId: args.jobId,
          generationId: args.generationId,
        });
      } else {
        // Schedule next module generation
        await ctx.scheduler.runAfter(0, internal.capsuleGeneration.generateModuleContent, {
          capsuleId: args.capsuleId,
          jobId: args.jobId,
          generationId: args.generationId,
          moduleIndex: nextModuleIndex,
          outline: args.outline,
        });
      }
    } catch (error) {
      console.error(`Module ${args.moduleIndex} generation failed:`, error);
      
      // Get current job to check retry count
      const job = await ctx.runQuery(internal.capsules.getGenerationJobById, {
        jobId: args.jobId,
      });

      const retryCount = (job?.retryCount || 0) + 1;

      if (retryCount < 3) {
        // Retry with exponential backoff
        await ctx.runMutation(internal.capsules.updateGenerationJob, {
          jobId: args.jobId,
          updates: {
            retryCount,
            lastError: error instanceof Error ? error.message : "Unknown error",
          },
        });
        
        // Schedule retry after delay
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
        await ctx.scheduler.runAfter(delay, internal.capsuleGeneration.generateModuleContent, {
          capsuleId: args.capsuleId,
          jobId: args.jobId,
          generationId: args.generationId,
          moduleIndex: args.moduleIndex,
          outline: args.outline,
        });
      } else {
        // Max retries reached - fail the generation
        await ctx.runMutation(api.capsules.updateCapsuleStatus, {
          capsuleId: args.capsuleId,
          status: "failed",
          errorMessage: `Failed to generate module ${args.moduleIndex + 1} after 3 attempts`,
        });
        await ctx.runMutation(internal.capsules.updateGenerationJob, {
          jobId: args.jobId,
          updates: {
            lastError: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }
  },
});

// =============================================================================
// STAGE 3: FINALIZATION
// =============================================================================

export const finalizeGeneration = internalAction({
  args: {
    capsuleId: v.id("capsules"),
    jobId: v.id("capsuleGenerationJobs"),
    generationId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Mark capsule as completed
      await ctx.runMutation(api.capsules.updateCapsuleStatus, {
        capsuleId: args.capsuleId,
        status: "completed",
      });

      // Mark job as completed
      await ctx.runMutation(internal.capsules.updateGenerationJob, {
        jobId: args.jobId,
        updates: {
          currentStage: "completed",
          completedAt: Date.now(),
        },
      });

      console.log(`Capsule ${args.capsuleId} generation completed successfully`);
    } catch (error) {
      console.error("Finalization failed:", error);
      await ctx.runMutation(api.capsules.updateCapsuleStatus, {
        capsuleId: args.capsuleId,
        status: "failed",
        errorMessage: "Failed to finalize generation",
      });
    }
  },
});

// =============================================================================
// AI GENERATION FUNCTIONS
// =============================================================================

const CAPSULE_OUTLINE_PROMPT = `You are an expert curriculum designer creating SHORT, FOCUSED micro-learning courses.

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: CONTENT SAFETY CHECK - MUST PERFORM FIRST ⚠️
═══════════════════════════════════════════════════════════════════════════════

Before generating any course content, you MUST analyze the requested topic for safety.

REJECT and return an error JSON if the topic involves ANY of the following:

🚫 VIOLENCE & HARM:
- Terrorism, terrorist attacks, extremism, radicalization
- How to harm, injure, or kill people
- Weapons creation, explosives, bombs, chemical weapons
- Mass violence, shootings, attacks on groups
- Self-harm, suicide methods

🚫 ILLEGAL ACTIVITIES:
- Drug manufacturing or trafficking
- Hacking for malicious purposes, cyberattacks
- Human trafficking, exploitation
- Fraud, scams, identity theft methods
- Money laundering, illegal financial schemes

🚫 DANGEROUS CONTENT:
- Child exploitation or abuse (CSAM)
- Sexual content involving minors
- Detailed instructions for dangerous activities
- Bypassing security systems for harmful purposes

🚫 HATE & DISCRIMINATION:
- Content promoting hatred against protected groups
- Racist, sexist, or discriminatory ideologies
- Genocide denial or promotion

IF THE TOPIC IS HARMFUL, return ONLY this JSON (no other output):
{
  "error": true,
  "errorType": "CONTENT_SAFETY_VIOLATION",
  "message": "This topic cannot be used to create educational content as it involves [brief reason]. Please choose a different topic that promotes positive learning."
}

IF THE TOPIC IS SAFE, proceed with the INPUT VALIDATION check below.

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: INPUT VALIDATION CHECK - MUST PERFORM SECOND ⚠️
═══════════════════════════════════════════════════════════════════════════════

REJECT and return an error JSON if the topic matches ANY of the following:

🚫 URLs & LINKS (NOT VALID TOPICS):
- YouTube links (youtube.com, youtu.be, www.youtube.com, etc.)
- Any website URLs (http://, https://, www.)
- Social media links (twitter.com, instagram.com, facebook.com, tiktok.com, etc.)
- File paths or URLs of any kind

🚫 NONSENSICAL/GIBBERISH INPUT:
- Random characters or keyboard smashing (e.g., "asdfgh", "qwerty", "hkdfdf", "jjjjj")
- Repeated letters/characters (e.g., "aaaa", "hehehe", "lolol", "xyzxyz")
- Single characters or very short meaningless strings (e.g., "x", "ab", "123")
- Text that doesn't represent a learnable topic or concept
- Emoji-only or symbol-only input
- Test strings (e.g., "test", "asdf", "foo", "bar", "lorem")

🚫 TOO VAGUE OR EMPTY:
- Single common words that aren't topics (e.g., "the", "and", "hello", "hi")
- Empty or whitespace-only input

IF THE INPUT IS INVALID, return ONLY this JSON (no other output):
{
  "error": true,
  "errorType": "CONTENT_SAFETY_VIOLATION",
  "message": "[Choose the appropriate message below based on the issue]"
}

Use these specific messages:
- For YouTube/URLs: "URLs and links cannot be used as course topics. Please enter an actual topic you want to learn about, such as 'Python Programming', 'World History', or 'Machine Learning'."
- For gibberish/nonsense: "The input doesn't appear to be a valid learning topic. Please enter a real subject you want to learn about, such as 'Data Structures', 'Philosophy', or 'Digital Marketing'."
- For too vague: "Please provide a more specific topic. For example, instead of a single word, try 'Introduction to Physics' or 'Web Development Fundamentals'."

IF THE INPUT IS VALID, proceed with course generation below.

═══════════════════════════════════════════════════════════════════════════════

OUTPUT: Raw JSON only. No markdown, no code fences, no explanation.

{
  "title": "Course Title",
  "description": "2-3 sentence description of what learners will master",
  "estimatedDuration": 45,
  "modules": [
    {
      "title": "Module 1 Title",
      "description": "Clear description of what this module covers",
      "lessons": [
        {
          "title": "Lesson Title",
          "description": "Specific learning outcome for this lesson"
        }
      ]
    }
  ]
}

COURSE DESIGN PRINCIPLES:
1. KEEP IT SHORT & FOCUSED:
   - 2-5 modules MAXIMUM (prefer 3-4 for most topics)
   - 2-4 lessons per module (prefer 2-3 lessons)
   - Each lesson should be completable in 5-10 minutes
   - Total course duration: 30-60 minutes

2. LOGICAL PROGRESSION:
   - Start with fundamentals, build to advanced concepts
   - Each module should be a complete learning unit
   - Lessons within a module should flow naturally

3. CLEAR LEARNING OUTCOMES:
   - Each module title should indicate the skill/concept
   - Each lesson description should state what learner will be able to do

4. TOPIC COVERAGE:
   - Cover core concepts thoroughly rather than many topics superficially
   - Focus on understanding, not just information
   - Include practical applications

RULES:
- 2-5 modules per course (NO MORE than 5)
- 2-4 lessons per module (NO MORE than 4)
- estimatedDuration is total minutes (number, not string)
- Output valid JSON only`;

const CAPSULE_MODULE_CONTENT_PROMPT = `You are a friendly, expert teacher creating ENGAGING, LEARNER-FOCUSED micro-learning content.

Your goal: Help learners truly UNDERSTAND concepts through clear explanations, relatable examples, and interactive elements ONLY WHEN THEY ADD VALUE.

OUTPUT: Raw JSON only. No markdown, no code fences, no explanation.

{
  "title": "Module Title",
  "introduction": "Friendly introduction that hooks the learner and explains why this matters",
  "learningObjectives": ["Clear, actionable objective 1", "Clear, actionable objective 2"],
  "lessons": [
    {
      "title": "Lesson Title",
      "content": {
        "sections": [
          {
            "type": "concept",
            "title": "What is [Concept]?",
            "content": "Clear, friendly explanation using simple language and analogies...",
            "keyPoints": ["Key insight 1", "Key insight 2", "Key insight 3"]
          },
          {
            "type": "explanation",
            "title": "How it Works",
            "content": "Detailed breakdown with step-by-step explanation...",
            "keyPoints": ["Important detail 1", "Important detail 2"]
          },
          {
            "type": "example",
            "title": "Real-World Example",
            "content": "Relatable example that connects theory to practice...",
            "keyPoints": ["What to notice", "Why this matters"]
          }
        ],
        "codeExamples": [],
        "interactiveVisualizations": [],
        "practiceQuestions": [
          {
            "type": "mcq",
            "question": "Clear question testing understanding?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctIndex": 0,
            "explanation": "Why this is correct and why others are wrong"
          },
          {
            "type": "fillBlanks",
            "instruction": "Complete the sentence by filling in the blanks",
            "text": "A {{blank1}} is a data structure that follows {{blank2}} principle.",
            "blanks": [
              { "id": "blank1", "correctAnswer": "stack", "alternatives": ["Stack", "STACK"], "hint": "Think of a pile of plates" },
              { "id": "blank2", "correctAnswer": "LIFO", "alternatives": ["Last In First Out", "last in first out"], "hint": "Last In, First Out" }
            ]
          },
          {
            "type": "dragDrop",
            "instruction": "Match the concepts with their descriptions",
            "items": [{ "id": "item1", "content": "Concept 1" }],
            "targets": [{ "id": "target1", "label": "Description 1", "acceptsItems": ["item1"] }],
            "feedback": { "correct": "Well done!", "incorrect": "Try again!" }
          }
        ]
      }
    }
  ],
  "moduleSummary": "Quick recap of what was learned and how it connects to the next module"
}

═══════════════════════════════════════════════════════════════════════════════
TEACHING STYLE - BEGINNER-FRIENDLY & CLEAR (ASSUME NO PRIOR KNOWLEDGE)
═══════════════════════════════════════════════════════════════════════════════

1. ASSUME ZERO PRIOR KNOWLEDGE:
   - NEVER assume the learner knows any prerequisite concepts
   - Define EVERY technical term when first introduced
   - Explain acronyms in full (e.g., "CPU (Central Processing Unit - the brain of your computer)")
   - Build from absolute basics - start with "What is..." before "How it works"
   - If concept A requires understanding concept B, explain B first briefly

2. EXPLAIN LIKE A FRIENDLY TEACHER:
   - Use conversational, warm language ("Let's explore...", "Here's the cool part...")
   - Start with WHY this matters to the learner before HOW it works
   - Use everyday analogies ("Think of RAM like your desk - more space means more work at once")
   - Break complex ideas into small, digestible pieces
   - Anticipate confusion and address it: "You might be wondering... Here's the answer"
   - Celebrate progress: "Now you understand the basics of..."

3. STRUCTURE EACH LESSON FOR UNDERSTANDING:
   - Hook: Start with a relatable question or real-world scenario
   - Foundation: Explain basic terms and concepts needed
   - Core Concept: Explain the main idea in simple language
   - Example: Show it in action with familiar scenarios
   - Recap: Summarize what was learned in 2-3 sentences
   - Practice: Let them test their understanding
   
4. KEY POINTS ARE ESSENTIAL:
   - Every section MUST have 2-4 keyPoints
   - Key points should be memorable, simple takeaways
   - Write them as if learner will only remember these
   - Avoid jargon in key points

5. CONTENT BALANCE PER LESSON:
   - 3-5 explanation sections (concept → explanation → example → deeper dive → connections)
   - Code examples: ONLY for programming/technical topics (see TOPIC ANALYSIS below)
   - Interactive visualizations: ONLY when they significantly enhance understanding (see guidelines below)
   - 2-4 practice questions - MUST ROTATE between these types across lessons:
     * MCQ - for conceptual understanding
     * fillBlanks - for terminology and recall (USE THIS TYPE FREQUENTLY!)
     * dragDrop - for matching and categorization

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: TOPIC-AWARE CONTENT GENERATION ⚠️
═══════════════════════════════════════════════════════════════════════════════

Before generating content, ANALYZE THE TOPIC TYPE and adapt accordingly:

📚 NON-TECHNICAL/HUMANITIES TOPICS (Philosophy, History, Literature, Psychology, Sociology, Art, Music, Language, Ethics, Religion, Politics, Culture, etc.):
   
   ✅ MUST INCLUDE:
   - Rich, detailed explanations with multiple perspectives
   - Historical context and background
   - Thought-provoking examples and case studies
   - Quotes from key thinkers/experts (with attribution)
   - Analogies and metaphors to clarify abstract concepts
   - Connections to everyday life and modern relevance
   - Critical thinking prompts and discussion points
   - Multiple real-world examples per concept
   - 4-5 sections per lesson minimum for depth
   
   ❌ MUST SKIP:
   - "codeExamples": [] (NO CODE - it adds no value!)
   - "interactiveVisualizations": [] (usually not beneficial)
   
   📝 FOR THESE TOPICS, COMPENSATE BY ADDING:
   - More explanation sections with different angles
   - Additional real-world examples and case studies
   - Thought experiments and hypothetical scenarios
   - Comparative analysis (comparing philosophers, eras, approaches)
   - More practice questions testing critical thinking

💻 TECHNICAL/STEM TOPICS (Programming, Math, Science, Engineering, Data Science, etc.):
   
   ✅ MAY INCLUDE (when beneficial):
   - 1-2 code examples with detailed explanations (for programming topics)
   - 0-1 interactive visualization (for algorithms, data structures, processes)
   
   ❌ STILL SKIP IF:
   - Topic is theoretical CS (complexity theory, automata) - use diagrams in text instead
   - Concept is simple enough to explain without code
   - Code would be trivial/obvious

6. WHEN TO INCLUDE VISUALIZATIONS (VERY SELECTIVE - DEFAULT TO SKIP!):
   
   ✅ INCLUDE visualization ONLY when ALL of these are true:
   - Topic involves DYNAMIC processes (things that change over time)
   - Visual demonstration is SIGNIFICANTLY better than text explanation
   - The concept has clear VISUAL components (movement, transformation, comparison)
   
   Specific cases where visualization helps:
   - Algorithm step-by-step execution (sorting, searching)
   - Data structure operations (stack push/pop, tree traversal)
   - Scientific simulations (physics, chemistry processes)
   - Mathematical functions and graphs
   - Process flows with multiple states
   
   ❌ DEFAULT TO SKIP visualization when:
   - Topic is humanities/social sciences (Philosophy, History, Literature, etc.)
   - Concept is abstract/theoretical without clear visual representation
   - Text explanation with examples is sufficient
   - Topic is about ideas, theories, or principles
   - Content is primarily about definitions, facts, or classifications
   - A simple diagram described in text would suffice
   
   If unsure → SKIP IT. More explanation sections are better than forced visualizations.

   ⚠️ CRITICAL: NO EMPTY PLACEHOLDER VISUALIZATIONS! ⚠️
   You MUST choose one of these two options:
   
   OPTION A - SKIP: Use empty array
   "interactiveVisualizations": []
   
   OPTION B - INCLUDE: Provide COMPLETE working code
   "interactiveVisualizations": [{
     "title": "...",
     "description": "...",
     "type": "simulation",
     "html": "<div id='viz-container'></div>",
     "css": "/* FULL CSS styles here */",
     "javascript": "/* FULL working JS code here - 50+ lines typically */"
   }]
   
   ❌ NEVER DO THIS (empty/placeholder):
   { "html": "<div></div>", "css": "", "javascript": "" }  ← BROKEN!
   
   If you cannot write complete working visualization code, use OPTION A (empty array).

═══════════════════════════════════════════════════════════════════════════════
VISUALIZATION REQUIREMENTS - WHEN INCLUDED, MUST BE ACCURATE & WORKING
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Visualizations must have COMPLETE, WORKING CODE!

1. SELF-CONTAINED & AUTO-RUNNING:
   - Renders IMMEDIATELY when loaded (no external "Run" button)
   - ALL controls (buttons, sliders) are INSIDE the HTML/JS
   - User interacts directly with the visualization
   - JavaScript MUST be 50+ lines of functional code

2. ACCURACY IS EVERYTHING:
   - Algorithms MUST animate in the CORRECT order
   - Data structures MUST show CORRECT operations (stack=LIFO, queue=FIFO)
   - Math/Physics MUST use correct formulas
   - Flowcharts MUST show correct logic flow

3. ⚠️ COLOR CONTRAST - CRITICAL FOR READABILITY ⚠️
   The app uses a DARK THEME. Follow these rules STRICTLY:
   
   THEME COLORS TO USE:
   - Background: hsl(224, 71%, 4%) - dark navy (#030711)
   - Surface/Card: hsl(222, 47%, 11%) - slightly lighter (#0f172a)
   - Border: hsl(217, 33%, 17%) - subtle border (#1e293b)
   - Text Primary: hsl(213, 31%, 91%) - light gray (#e2e8f0)
   - Text Muted: hsl(215, 20%, 65%) - muted gray (#94a3b8)
   - Primary Blue: hsl(217, 91%, 60%) - accent blue (#3b82f6)
   - Success Green: hsl(142, 71%, 45%) - green (#22c55e)
   - Warning Amber: hsl(38, 92%, 50%) - amber (#f59e0b)
   - Error Red: hsl(0, 84%, 60%) - red (#ef4444)
   
   CONTRAST RULES - MUST FOLLOW:
   ✓ Light text (#e2e8f0, white) on DARK backgrounds (#030711, #0f172a, #1e293b)
   ✓ Dark text (#0f172a, #1e293b) on LIGHT backgrounds (#f1f5f9, #e2e8f0, white)
   ✓ White text on colored backgrounds (blue, green, red buttons)
   ✓ Dark text on yellow/amber backgrounds (warning states)
   
   ✗ NEVER: Light text on light backgrounds (unreadable!)
   ✗ NEVER: Dark text on dark backgrounds (invisible!)
   ✗ NEVER: Use random gradient colors - stick to theme
   
   EXAMPLE - CORRECT:
   - Box with light bg: style="background:#f1f5f9; color:#0f172a;"
   - Box with dark bg: style="background:#0f172a; color:#e2e8f0;"
   - Blue button: style="background:#3b82f6; color:white;"

4. CODE REQUIREMENTS:
   - Vanilla JavaScript ONLY (no libraries)
   - ERROR-FREE - test logic mentally before outputting
   - All variables declared before use
   - All DOM elements created before accessed
   - Proper event handlers attached

5. RESPONSIVE SIZING & SPEED CONTROLS:
   - Use percentage-based widths: style="width: 100%; max-width: 600px;"
   - For canvas, set width dynamically:
     const canvas = document.getElementById('myCanvas');
     canvas.width = Math.min(container.clientWidth - 40, 600);
     canvas.height = canvas.width * 0.6; // Maintain aspect ratio
   - ADD SPEED SLIDER for all animations:
     <label>Speed: <input type="range" id="speedSlider" min="100" max="1000" value="400"></label>
     const speed = parseInt(document.getElementById('speedSlider').value);
     await new Promise(r => setTimeout(r, speed));
   - Disable buttons during animation, re-enable after

6. USE THESE PRE-BUILT VISUALIZATION TEMPLATES:

   ═══════════════════════════════════════════════════════════════════════════════
   BAR CHART TEMPLATE - For comparing values, showing distributions
   ═══════════════════════════════════════════════════════════════════════════════
   \`\`\`javascript
   // Container & Styles
   const container = document.getElementById('viz-container') || document.body;
   container.innerHTML = \`
     <style>
       .chart-container { background: #0f172a; padding: 20px; border-radius: 8px; }
       .chart-title { color: #e2e8f0; font-size: 18px; margin-bottom: 16px; text-align: center; }
       .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 200px; padding: 0 20px; }
       .bar-wrapper { display: flex; flex-direction: column; align-items: center; flex: 1; }
       .bar { background: linear-gradient(to top, #3b82f6, #60a5fa); border-radius: 4px 4px 0 0; min-width: 30px; transition: height 0.5s ease, background 0.3s ease; }
       .bar:hover { background: linear-gradient(to top, #22c55e, #4ade80); }
       .bar-label { color: #94a3b8; font-size: 12px; margin-top: 8px; }
       .bar-value { color: white; font-size: 11px; font-weight: bold; padding: 4px; }
     </style>
     <div class="chart-container">
       <div class="chart-title">Example Bar Chart</div>
       <div class="bar-chart" id="barChart"></div>
     </div>
   \`;
   
   // Data - CUSTOMIZE THIS
   const data = [
     { label: 'A', value: 40 },
     { label: 'B', value: 75 },
     { label: 'C', value: 55 },
     { label: 'D', value: 90 }
   ];
   
   const chart = document.getElementById('barChart');
   const maxValue = Math.max(...data.map(d => d.value));
   
   data.forEach(item => {
     const wrapper = document.createElement('div');
     wrapper.className = 'bar-wrapper';
     const heightPercent = (item.value / maxValue) * 100;
     wrapper.innerHTML = \`
       <div class="bar" style="height: \${heightPercent}%">
         <span class="bar-value">\${item.value}</span>
       </div>
       <span class="bar-label">\${item.label}</span>
     \`;
     chart.appendChild(wrapper);
   });
   \`\`\`

   ═══════════════════════════════════════════════════════════════════════════════
   TREE VISUALIZATION TEMPLATE - For hierarchies, DOM, file systems
   ═══════════════════════════════════════════════════════════════════════════════
   \`\`\`javascript
   const container = document.getElementById('viz-container') || document.body;
   container.innerHTML = \`
     <style>
       .tree-container { background: #0f172a; padding: 20px; border-radius: 8px; }
       .tree-title { color: #e2e8f0; font-size: 18px; margin-bottom: 20px; text-align: center; }
       .tree-level { display: flex; justify-content: center; gap: 20px; margin-bottom: 30px; position: relative; }
       .tree-node { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 12px 20px; border-radius: 8px; font-weight: 500; position: relative; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
       .tree-node:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); }
       .tree-node.active { background: linear-gradient(135deg, #22c55e, #16a34a); }
       .tree-node::after { content: ''; position: absolute; top: 100%; left: 50%; width: 2px; height: 30px; background: #475569; }
       .tree-level:last-child .tree-node::after { display: none; }
       .tree-connector { position: absolute; top: -10px; left: 0; right: 0; height: 2px; background: #475569; }
     </style>
     <div class="tree-container">
       <div class="tree-title">Tree Structure</div>
       <div id="treeView"></div>
     </div>
   \`;
   
   // Tree data - CUSTOMIZE THIS
   const treeData = {
     label: 'Root',
     children: [
       { label: 'Child 1', children: [{ label: 'Leaf A' }, { label: 'Leaf B' }] },
       { label: 'Child 2', children: [{ label: 'Leaf C' }] }
     ]
   };
   
   function renderTree(node, parentEl, level = 0) {
     const levelDiv = document.createElement('div');
     levelDiv.className = 'tree-level';
     const nodeEl = document.createElement('div');
     nodeEl.className = 'tree-node';
     nodeEl.textContent = node.label;
     nodeEl.onclick = () => nodeEl.classList.toggle('active');
     levelDiv.appendChild(nodeEl);
     parentEl.appendChild(levelDiv);
     if (node.children) {
       node.children.forEach(child => renderTree(child, parentEl, level + 1));
     }
   }
   
   renderTree(treeData, document.getElementById('treeView'));
   \`\`\`

   ═══════════════════════════════════════════════════════════════════════════════
   SORTING ALGORITHM TEMPLATE - For bubble sort, quicksort, mergesort animations
   ═══════════════════════════════════════════════════════════════════════════════
   \`\`\`javascript
   const container = document.getElementById('viz-container') || document.body;
   container.innerHTML = \`
     <style>
       .sort-container { background: #0f172a; padding: 20px; border-radius: 8px; }
       .sort-title { color: #e2e8f0; font-size: 18px; margin-bottom: 16px; text-align: center; }
       .sort-controls { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
       .sort-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
       .sort-btn:hover { background: #2563eb; }
       .sort-btn:disabled { background: #475569; cursor: not-allowed; }
       .sort-bars { display: flex; align-items: flex-end; gap: 4px; height: 200px; justify-content: center; }
       .sort-bar { background: #3b82f6; border-radius: 4px 4px 0 0; transition: height 0.3s, background 0.3s; min-width: 40px; display: flex; align-items: flex-end; justify-content: center; }
       .sort-bar span { color: white; font-size: 12px; font-weight: bold; padding-bottom: 5px; }
       .sort-bar.comparing { background: #f59e0b; }
       .sort-bar.swapping { background: #ef4444; }
       .sort-bar.sorted { background: #22c55e; }
       .sort-status { color: #94a3b8; text-align: center; margin-top: 16px; font-size: 14px; }
     </style>
     <div class="sort-container">
       <div class="sort-title">Bubble Sort Visualization</div>
       <div class="sort-controls">
         <button class="sort-btn" id="startBtn">Start Sort</button>
         <button class="sort-btn" id="resetBtn">Reset</button>
       </div>
       <div class="sort-bars" id="bars"></div>
       <div class="sort-status" id="status">Click Start to begin</div>
     </div>
   \`;
   
   let arr = [64, 34, 25, 12, 22, 11, 90];
   let sorting = false;
   
   function renderBars(comparing = [], swapping = [], sorted = []) {
     const barsEl = document.getElementById('bars');
     const maxVal = Math.max(...arr);
     barsEl.innerHTML = arr.map((val, i) => {
       let cls = 'sort-bar';
       if (sorted.includes(i)) cls += ' sorted';
       else if (swapping.includes(i)) cls += ' swapping';
       else if (comparing.includes(i)) cls += ' comparing';
       return \`<div class="\${cls}" style="height: \${(val/maxVal)*180}px"><span>\${val}</span></div>\`;
     }).join('');
   }
   
   async function bubbleSort() {
     sorting = true;
     document.getElementById('startBtn').disabled = true;
     const n = arr.length;
     for (let i = 0; i < n - 1 && sorting; i++) {
       for (let j = 0; j < n - i - 1 && sorting; j++) {
         renderBars([j, j + 1]);
         document.getElementById('status').textContent = \`Comparing \${arr[j]} and \${arr[j+1]}\`;
         await new Promise(r => setTimeout(r, 500));
         if (arr[j] > arr[j + 1]) {
           renderBars([], [j, j + 1]);
           document.getElementById('status').textContent = \`Swapping \${arr[j]} and \${arr[j+1]}\`;
           [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
           await new Promise(r => setTimeout(r, 500));
         }
         renderBars();
       }
     }
     renderBars([], [], arr.map((_, i) => i));
     document.getElementById('status').textContent = 'Sorted!';
     document.getElementById('startBtn').disabled = false;
   }
   
   function reset() {
     sorting = false;
     arr = [64, 34, 25, 12, 22, 11, 90];
     renderBars();
     document.getElementById('status').textContent = 'Click Start to begin';
     document.getElementById('startBtn').disabled = false;
   }
   
   document.getElementById('startBtn').onclick = bubbleSort;
   document.getElementById('resetBtn').onclick = reset;
   renderBars();
   \`\`\`

   ═══════════════════════════════════════════════════════════════════════════════
   STACK DATA STRUCTURE TEMPLATE - For LIFO operations
   ═══════════════════════════════════════════════════════════════════════════════
   \`\`\`javascript
   const container = document.getElementById('viz-container') || document.body;
   container.innerHTML = \`
     <style>
       .stack-container { background: #0f172a; padding: 20px; border-radius: 8px; }
       .stack-title { color: #e2e8f0; font-size: 18px; margin-bottom: 16px; text-align: center; }
       .stack-controls { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; align-items: center; }
       .stack-input { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; padding: 10px; border-radius: 6px; width: 80px; }
       .stack-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
       .stack-btn.pop { background: #ef4444; }
       .stack-view { display: flex; flex-direction: column-reverse; align-items: center; min-height: 200px; border: 2px dashed #334155; border-radius: 8px; padding: 10px; margin: 0 auto; width: 120px; }
       .stack-item { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 12px 30px; border-radius: 6px; margin: 4px 0; animation: slideIn 0.3s ease; font-weight: bold; }
       @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
       .stack-pointer { color: #22c55e; font-size: 24px; margin-left: 10px; }
       .stack-info { color: #94a3b8; text-align: center; margin-top: 16px; }
     </style>
     <div class="stack-container">
       <div class="stack-title">Stack (LIFO) - Last In, First Out</div>
       <div class="stack-controls">
         <input type="number" class="stack-input" id="stackInput" value="1" min="1" max="99">
         <button class="stack-btn" id="pushBtn">Push</button>
         <button class="stack-btn pop" id="popBtn">Pop</button>
       </div>
       <div style="display: flex; align-items: center; justify-content: center;">
         <div class="stack-view" id="stackView"></div>
         <span class="stack-pointer" id="pointer">← Top</span>
       </div>
       <div class="stack-info" id="stackInfo">Stack is empty</div>
     </div>
   \`;
   
   let stack = [];
   
   function render() {
     const view = document.getElementById('stackView');
     view.innerHTML = stack.map(v => \`<div class="stack-item">\${v}</div>\`).join('');
     document.getElementById('pointer').style.visibility = stack.length ? 'visible' : 'hidden';
     document.getElementById('stackInfo').textContent = stack.length ? \`Size: \${stack.length} | Top: \${stack[stack.length-1]}\` : 'Stack is empty';
   }
   
   document.getElementById('pushBtn').onclick = () => {
     const val = parseInt(document.getElementById('stackInput').value) || 0;
     if (stack.length < 8) { stack.push(val); render(); }
   };
   
   document.getElementById('popBtn').onclick = () => {
     if (stack.length > 0) { stack.pop(); render(); }
   };
   
   render();
   \`\`\`

   ═══════════════════════════════════════════════════════════════════════════════
   QUEUE DATA STRUCTURE TEMPLATE - For FIFO operations
   ═══════════════════════════════════════════════════════════════════════════════
   \`\`\`javascript
   const container = document.getElementById('viz-container') || document.body;
   container.innerHTML = \`
     <style>
       .queue-container { background: #0f172a; padding: 20px; border-radius: 8px; }
       .queue-title { color: #e2e8f0; font-size: 18px; margin-bottom: 16px; text-align: center; }
       .queue-controls { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; align-items: center; }
       .queue-input { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; padding: 10px; border-radius: 6px; width: 80px; }
       .queue-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
       .queue-btn.dequeue { background: #ef4444; }
       .queue-wrapper { display: flex; align-items: center; justify-content: center; gap: 10px; }
       .queue-label { color: #22c55e; font-weight: bold; }
       .queue-view { display: flex; align-items: center; min-height: 60px; border: 2px dashed #334155; border-radius: 8px; padding: 10px 20px; min-width: 300px; }
       .queue-item { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 12px 20px; border-radius: 6px; margin: 0 4px; animation: slideRight 0.3s ease; font-weight: bold; }
       @keyframes slideRight { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
       .queue-info { color: #94a3b8; text-align: center; margin-top: 16px; }
     </style>
     <div class="queue-container">
       <div class="queue-title">Queue (FIFO) - First In, First Out</div>
       <div class="queue-controls">
         <input type="number" class="queue-input" id="queueInput" value="1" min="1" max="99">
         <button class="queue-btn" id="enqueueBtn">Enqueue</button>
         <button class="queue-btn dequeue" id="dequeueBtn">Dequeue</button>
       </div>
       <div class="queue-wrapper">
         <span class="queue-label">Front →</span>
         <div class="queue-view" id="queueView"></div>
         <span class="queue-label">← Rear</span>
       </div>
       <div class="queue-info" id="queueInfo">Queue is empty</div>
     </div>
   \`;
   
   let queue = [];
   
   function render() {
     const view = document.getElementById('queueView');
     view.innerHTML = queue.map(v => \`<div class="queue-item">\${v}</div>\`).join('');
     document.getElementById('queueInfo').textContent = queue.length ? \`Size: \${queue.length} | Front: \${queue[0]} | Rear: \${queue[queue.length-1]}\` : 'Queue is empty';
   }
   
   document.getElementById('enqueueBtn').onclick = () => {
     const val = parseInt(document.getElementById('queueInput').value) || 0;
     if (queue.length < 8) { queue.push(val); render(); }
   };
   
   document.getElementById('dequeueBtn').onclick = () => {
     if (queue.length > 0) { queue.shift(); render(); }
   };
   
   render();
   \`\`\`

6. VISUALIZATION TYPES TO USE:

   FLOWCHART/PROCESS DIAGRAM:
   - Use canvas to draw boxes and arrows
   - Highlight current step during animation
   - Show decision points clearly
   - Include: Step through, Auto-play, Reset

   ALGORITHM ANIMATION:
   - Show data as visual elements (bars, nodes)
   - Highlight elements being compared/swapped
   - Use colors: yellow=comparing, red=swapping, green=sorted
   - Include: Start, Pause, Reset, Speed control

   DATA STRUCTURE:
   - Draw structure visually (stack as vertical, queue as horizontal)
   - Animate push/pop/enqueue/dequeue operations
   - Show values and pointers
   - Include: Add, Remove, Reset buttons

   CONCEPT SIMULATION:
   - Interactive demonstration of the concept
   - Let user manipulate inputs and see results
   - Show cause and effect clearly

═══════════════════════════════════════════════════════════════════════════════
PRACTICE QUESTIONS - MIX TYPES FOR ENGAGEMENT (ROTATE ALL 3 TYPES!)
═══════════════════════════════════════════════════════════════════════════════

1. MCQ - For conceptual understanding:
   {
     "type": "mcq",
     "question": "What is the time complexity of binary search?",
     "options": ["O(1)", "O(log n)", "O(n)", "O(n²)"],
     "correctIndex": 1,
     "explanation": "Binary search halves the search space each step, giving O(log n)."
   }
   
   MCQ VALIDATION RULES:
   - MUST have exactly 4 options
   - correctIndex MUST be 0, 1, 2, or 3
   - explanation MUST explain why correct answer is right

2. FILL IN BLANKS - For terminology and recall:
   {
     "type": "fillBlanks",
     "instruction": "Complete the statement about arrays",
     "text": "Arrays provide {{blank1}} time access to elements using an {{blank2}}.",
     "blanks": [
       { "id": "blank1", "correctAnswer": "O(1)", "alternatives": ["constant", "constant time"], "hint": "Very fast - single operation" },
       { "id": "blank2", "correctAnswer": "index", "alternatives": ["Index", "INDEX"], "hint": "A number that identifies position" }
     ]
   }
   
   FILL BLANKS VALIDATION RULES:
   - "text" field MUST contain {{blankId}} placeholders
   - Number of {{blankId}} in text MUST EQUAL number of items in blanks array
   - Each blank id MUST match a {{blankId}} placeholder in text
   - Each blank needs: id, correctAnswer, alternatives (array), hint

3. DRAG & DROP - For matching/categorization:
   {
     "type": "dragDrop",
     "instruction": "Match data structures to their properties",
     "items": [
       { "id": "item1", "content": "Stack" },
       { "id": "item2", "content": "Queue" },
       { "id": "item3", "content": "Array" }
     ],
     "targets": [
       { "id": "target1", "label": "LIFO - Last In First Out", "acceptsItems": ["item1"] },
       { "id": "target2", "label": "FIFO - First In First Out", "acceptsItems": ["item2"] },
       { "id": "target3", "label": "Index-based access", "acceptsItems": ["item3"] }
     ],
     "feedback": { "correct": "Well done!", "incorrect": "Try again!" }
   }
   
   ⚠️ DRAG & DROP VALIDATION RULES - CRITICAL!:
   - Number of items MUST EQUAL number of targets
   - EVERY item MUST appear in exactly ONE target's acceptsItems
   - EVERY target MUST have at least one item in acceptsItems
   - MINIMUM 2 items/targets, MAXIMUM 5 items/targets
   - Item IDs: item1, item2, item3... Target IDs: target1, target2, target3...
   
   ❌ INVALID (DO NOT DO):
   - 2 targets but only 1 item
   - Item not referenced in any acceptsItems
   - Empty acceptsItems array

⚠️ IMPORTANT: Each lesson MUST include at least one fillBlanks question!
Rotate question types across lessons to keep learners engaged.

Output valid JSON only.`;

interface CapsuleOutlineResponse {
  error?: boolean;
  message?: string;
  description?: string;
  estimatedDuration?: number;
  modules?: Array<{
    title: string;
    description?: string;
    lessons?: Array<{ title: string; description?: string }>;
  }>;
}

async function generateCapsuleOutlineAI(topic: string, guidance: string): Promise<CapsuleOutlineResponse> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
  }

  const prompt = `${CAPSULE_OUTLINE_PROMPT}

Topic: ${topic}
${guidance ? `Additional guidance: ${guidance}` : ""}

Generate the course outline:`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response from AI");
  }

  // Extract JSON from response
  return extractJsonFromResponse(text) as CapsuleOutlineResponse;
}

interface ModuleContentResponse {
  title?: string;
  description?: string;
  introduction?: string;
  learningObjectives?: string[];
  moduleSummary?: string;
  lessons?: Array<{
    title?: string;
    description?: string;
    content?: unknown;
  }>;
}

async function generateModuleContentAI(input: {
  topic: string;
  capsuleTitle: string;
  capsuleDescription: string;
  moduleTitle: string;
  moduleDescription: string;
  moduleIndex: number;
  lessons: Array<{ title: string; description?: string }>;
}): Promise<ModuleContentResponse> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
  }

  const lessonList = input.lessons
    .map((l, i) => `${i + 1}. ${l.title}${l.description ? ` - ${l.description}` : ""}`)
    .join("\n");

  const prompt = `${CAPSULE_MODULE_CONTENT_PROMPT}

Course: ${input.capsuleTitle}
Course Description: ${input.capsuleDescription}
Topic: ${input.topic}

Module ${input.moduleIndex + 1}: ${input.moduleTitle}
Module Description: ${input.moduleDescription}

Lessons to generate content for:
${lessonList}

Generate detailed content for all lessons in this module:`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response from AI");
  }

  return extractJsonFromResponse(text) as ModuleContentResponse;
}

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
function extractJsonFromResponse(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Continue to other strategies
      }
    }

    // Try to find JSON object boundaries
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        // Continue
      }
    }

    throw new Error("Could not parse JSON from AI response");
  }
}
