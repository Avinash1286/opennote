"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// =============================================================================
// PROMPTS
// =============================================================================

const SIMULATION_IDEAS_SYSTEM_PROMPT = `You are an expert educator who creates interactive simulations to help students understand complex concepts. Analyze the video transcript and determine if interactive simulations would be helpful.

IMPORTANT RULES:
1. Only suggest simulations for content that ACTUALLY benefits from visual/interactive demonstration
2. Good candidates: physics concepts, mathematical visualizations, algorithms, data structures, chemical reactions, biological processes, economic models, signal processing, etc.
3. Bad candidates: opinion pieces, interviews, vlogs, news commentary, purely theoretical discussions without visual components
4. Generate MINIMUM 1 and MAXIMUM 3 simulation ideas
5. If the content doesn't benefit from simulations, return an empty array
6. Each simulation should be achievable with pure HTML, CSS, and JavaScript (no external libraries)
7. Focus on the CORE concepts that would be most impactful to visualize

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "isApplicable": true/false,
  "reason": "Brief explanation of why simulations are/aren't applicable",
  "simulations": [
    {
      "id": "unique-id-1",
      "title": "Short descriptive title",
      "description": "Detailed description of what the simulation will show, how users will interact with it, and what concepts it demonstrates. Be specific about the visual elements, controls, and expected behavior.",
      "concepts": ["concept1", "concept2"],
      "complexity": "simple" | "moderate" | "complex"
    }
  ]
}`;

const SIMULATION_CODE_SYSTEM_PROMPT = `You are an expert web developer creating educational interactive simulations. Generate a complete, working simulation using only HTML, CSS, and JavaScript.

CRITICAL REQUIREMENTS:
1. The code must be SELF-CONTAINED - no external libraries, CDNs, or dependencies
2. Use vanilla JavaScript only (no React, Vue, jQuery, etc.)
3. All CSS must be inline in a <style> tag
4. All JavaScript must be inline in a <script> tag
5. The simulation must be INTERACTIVE - users should be able to manipulate parameters
6. Include clear labels, instructions, and visual feedback
7. Use modern CSS features (flexbox, grid, CSS variables) for layout
8. Make it visually appealing with good color choices and smooth animations
9. Ensure it works in an iframe sandbox environment
10. Add controls (sliders, buttons) for users to experiment
11. Include educational annotations that explain what's happening
12. Handle edge cases gracefully

VISUAL QUALITY:
- Use a dark theme that matches modern UI (background: #1a1a2e or similar)
- Add subtle gradients and shadows for depth
- Use smooth CSS transitions and animations
- Make interactive elements clearly identifiable
- Include a title and brief instructions in the simulation

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "html": "<!DOCTYPE html>\\n<html>...</html>",
  "css": "/* Additional CSS if needed, usually empty since CSS is in HTML */",
  "js": "/* Additional JS if needed, usually empty since JS is in HTML */"
}

The HTML should be a complete, standalone document that can be rendered in an iframe.`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function callGeminiAPI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: userPrompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 16384,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response from Gemini API");
  }

  return text;
}

function extractJSON(text: string): unknown {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from response");
  }
  return JSON.parse(jsonMatch[0]);
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Generate simulation ideas from video transcript
 * This is the first step - analyze transcript and suggest simulations
 */
export const generateSimulationIdeas = action({
  args: {
    videoId: v.string(),
    transcript: v.string(),
    videoTitle: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const { videoId, transcript, videoTitle } = args;

    // Update status to generating
    await ctx.runMutation(api.simulationsMutations.updateIdeasStatus, {
      videoId,
      status: "generating",
    });

    try {
      // Truncate transcript if too long
      const truncatedTranscript =
        transcript.length > 30000
          ? transcript.substring(0, 30000) + "\n...[transcript truncated]"
          : transcript;

      const prompt = `Video Title: ${videoTitle}\n\nTranscript:\n${truncatedTranscript}\n\nAnalyze this video content and suggest interactive simulations that would help students understand the concepts better.`;

      const responseText = await callGeminiAPI(SIMULATION_IDEAS_SYSTEM_PROMPT, prompt);
      const result = extractJSON(responseText) as {
        isApplicable: boolean;
        reason: string;
        simulations: Array<{
          id: string;
          title: string;
          description: string;
          concepts: string[];
          complexity: string;
        }>;
      };

      // Validate structure
      if (typeof result.isApplicable !== "boolean" || !Array.isArray(result.simulations)) {
        throw new Error("Invalid response structure");
      }

      // If not applicable, update status accordingly
      if (!result.isApplicable || result.simulations.length === 0) {
        await ctx.runMutation(api.simulationsMutations.updateIdeasStatus, {
          videoId,
          status: "not-applicable",
          error: result.reason,
        });
        return { success: true };
      }

      // Save each simulation idea to the database
      for (const sim of result.simulations) {
        await ctx.runMutation(api.simulationsMutations.createSimulationIdea, {
          videoId,
          ideaId: sim.id,
          title: sim.title,
          description: sim.description,
          concepts: sim.concepts,
          complexity: sim.complexity,
        });
      }

      // Update status to completed
      await ctx.runMutation(api.simulationsMutations.updateIdeasStatus, {
        videoId,
        status: "completed",
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Simulations] Ideas generation failed:", errorMessage);

      await ctx.runMutation(api.simulationsMutations.updateIdeasStatus, {
        videoId,
        status: "failed",
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Generate actual simulation code for a specific simulation idea
 * This is called when user clicks on a simulation idea
 */
export const generateSimulationCode = action({
  args: {
    videoId: v.string(),
    ideaId: v.string(),
    title: v.string(),
    description: v.string(),
    concepts: v.array(v.string()),
    transcript: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const { videoId, ideaId, title, description, concepts, transcript } = args;

    // Update simulation status to generating
    await ctx.runMutation(api.simulationsMutations.updateSimulationStatus, {
      videoId,
      ideaId,
      status: "generating",
    });

    try {
      // Build a detailed prompt for code generation
      const contextFromTranscript = transcript
        ? `\n\nRelevant context from the video:\n${transcript.substring(0, 5000)}`
        : "";

      const prompt = `Create an interactive simulation with the following specifications:

TITLE: ${title}

DESCRIPTION: ${description}

KEY CONCEPTS TO DEMONSTRATE: ${concepts.join(", ")}

${contextFromTranscript}

Generate a complete, self-contained HTML file with embedded CSS and JavaScript that creates this interactive simulation. The simulation should be educational, visually appealing, and highly interactive.`;

      const responseText = await callGeminiAPI(SIMULATION_CODE_SYSTEM_PROMPT, prompt);
      const result = extractJSON(responseText) as {
        html: string;
        css: string;
        js: string;
      };

      // Validate structure
      if (!result.html) {
        throw new Error("Invalid response - missing HTML");
      }

      // Save the generated code
      await ctx.runMutation(api.simulationsMutations.saveSimulationCode, {
        videoId,
        ideaId,
        code: {
          html: result.html,
          css: result.css || "",
          js: result.js || "",
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Simulations] Code generation failed:", errorMessage);

      await ctx.runMutation(api.simulationsMutations.updateSimulationStatus, {
        videoId,
        ideaId,
        status: "failed",
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});
