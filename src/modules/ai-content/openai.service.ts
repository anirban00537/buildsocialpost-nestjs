import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface BackgroundColors {
  color1: string; // Background Color
  color2: string; // Text Color
  color3: string; // Tint Color
  color4: string; // Accent Color
}

type Slide = {
  tagline?: string;
  title?: string;
  paragraph?: string;
  'Call to action'?: string;
};

interface LinkedInPost {
  title: string;
  content: string;
}

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateCarouselContentFromTopic(
    topic: string,
    numSlides: number = 5,
    language: string = 'en',
    mood: string = 'neutral',
    contentStyle: string = 'Professional',
    targetAudience: string = 'General',
  ): Promise<string> {
    try {
      const maxTokensPerSlide = 100;
      const maxTokens = Math.min(numSlides * maxTokensPerSlide, 1000);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          {
            role: 'user',
            content: `You are an expert LinkedIn carousel content creator. Generate ${numSlides} engaging and informative carousel slides on the topic "${topic}". The ${numSlides} slides should exclude the intro and outro. Use the following format and guidelines:

            Guidelines:
            - Each slide should focus on a single idea or concept.
            - Ensure that the content is concise, clear, and engaging.
            - Reorganize and rephrase content to fit the slide format naturally.
            - **Wrap the most important keywords, phrases, and concepts in both the title and description within <strong></strong> tags.** This is crucial for highlighting key points.
            - Use a consistent tone that matches the specified mood (${mood}) and content style (${contentStyle}).
            - Tailor the content for the ${contentStyle} style and ${targetAudience} audience.
            - Do not provide any markdown formatting.
            
            Format:

            [Intro]
            type: intro
            tagline: [max 60 characters]
            title: [max 60 characters]
            description: [200-300 characters]

            [Slide {n}]
            type: slide
            title: [max 60 characters, with important text wrapped in <strong></strong> tags]
            description: [200-300 characters, with important text wrapped in <strong></strong> tags]

            [Outro]
            type: outro
            tagline: [max 60 characters]
            title: [max 60 characters]
            description: [200-300 characters]

            The content should be in ${language} and convey a ${mood} mood. Ensure that important text is wrapped in <strong></strong> tags as instructed. Do not include any additional text or explanations.
            `,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.6,
      });

      if (response && response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      } else {
        throw new Error('No response from OpenAI');
      }
    } catch (error) {
      this.logger.error('Error generating carousel content:', error);
      throw error;
    }
  }

  async generateCarouselColorPaletteFromPromptTopic(
    topic: string,
    theme: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          {
            role: 'user',
            content: `Generate a ${theme} theme color palette for "${topic}" with 4 hex color codes for an AI carousel generator.

            Guidelines:
            - Identify brand colors associated with the topic or industry.
            - **color4: Main brand color or most representative color for the topic.**
            - **color3: A lighter version of the brand color.**
            - For "dark" theme: color1 should be dark, color2 should be light.
            - For "light" theme: color1 should be light, color2 should be dark.
            - Ensure high contrast between colors for readability.
            - Palette should be cohesive and appropriate for the topic.
            - Provide only the color palette in the specified format.

            Format:
            color1: [hex code]
            color2: [hex code]
            color3: [hex code] (lighter version of brand color)*
            color4: [hex code] (main brand/representative color)
            `,
          },
        ],
        max_tokens: 100,
        temperature: 0.6,
      });

      if (response && response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      } else {
        throw new Error('No response from OpenAI');
      }
    } catch (error) {
      this.logger.error('Error generating color palette:', error);
      throw error;
    }
  }

  parseCarouselContentToJSON(content: string): Slide[] {
    const slides: Slide[] = [];
    const sections = content
      .split(/\[|\]/)
      .filter((section) => section.trim() !== '');

    sections.forEach((section) => {
      const lines = section.split('\n').filter((line) => line.trim() !== '');
      if (lines.length === 0) return;

      const slide: Slide = {};
      lines.forEach((line) => {
        const [key, ...value] = line.split(':');
        if (key && value.length > 0) {
          const trimmedKey = key.trim();
          if (this.isValidSlideKey(trimmedKey)) {
            slide[trimmedKey] = value.join(':').trim();
          }
        }
      });

      // Only push the slide if it has at least one key-value pair
      if (Object.keys(slide).length > 0) {
        slides.push(slide);
      }
    });

    return slides;
  }

  parseColorPaletteToJSON(content: string): BackgroundColors {
    const colors: BackgroundColors = {
      color1: '',
      color2: '',
      color3: '',
      color4: '',
    };
    const lines = content.split('\n').filter((line) => line.trim() !== '');
    lines.forEach((line) => {
      const [key, ...value] = line.split(':');
      if (key && value.length > 0) {
        const trimmedKey = key.trim();
        if (this.isValidColorKey(trimmedKey)) {
          colors[trimmedKey] = value.join(':').trim();
        }
      }
    });
    return colors;
  }

  private isValidSlideKey(key: string): key is keyof Slide {
    return ['type', 'tagline', 'title', 'description'].includes(key);
  }

  private isValidColorKey(key: string): key is keyof BackgroundColors {
    return ['color1', 'color2', 'color3', 'color4'].includes(key);
  }

  async generateLinkedInPosts(
    prompt: string,
    numPosts: number = 3,
    language: string = 'en',
    tone: string = 'professional',
  ): Promise<string> {
    try {
      const maxTokensPerPost = 500;
      const maxTokens = Math.min(numPosts * maxTokensPerPost, 2000);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          {
            role: 'user',
            content: `You are a viral LinkedIn content expert who has helped 100+ posts go viral. Create ${numPosts} compelling LinkedIn posts about "${prompt}" that will drive massive engagement.

            [Post 1]
            title: Your title here
            content: Your content here

            [Post 2]
            title: Your title here
            content: Your content here

            Content Creation Framework:

            1. 🎯 HEADLINE FORMULAS (Choose one):
               • "I Discovered [Unexpected Solution] for [Common Problem]..."
               • "[X] Things Nobody Tells You About [Topic]..."
               • "The Truth About [Topic] That [Industry] Doesn't Want You to Know..."
               • "How I [Achieved Result] in [Timeframe] Using [Method]..."
               • "Why [Common Belief] Is Wrong, And What To Do Instead..."

            2. 🚀 POST STRUCTURE:
               a) 💥 HOOK (First 2 lines):
                  • Start with "I was wrong about [topic]..."
                  • Or "The biggest mistake in [industry] is..."
                  • Or "Here's what [X] years in [industry] taught me..."
                  • Must stop readers from scrolling
               
               b) 📈 STORY/CONTEXT (2-3 lines):
                  • Share a personal failure/success
                  • Present a surprising statistic
                  • Challenge common wisdom
                  • Create tension/conflict
               
               c) 🎓 MAIN CONTENT (3-4 paragraphs):
                  • Use the "PAS" formula:
                    Problem: Identify the pain point
                    Agitation: Why it matters
                    Solution: Your unique insight
                  
                  • Format for scanning:
                    → Use arrows for key points
                    • Bullet points for lists
                    1. Numbers for steps
                    ... Ellipsis for suspense
                    
                  • Add credibility markers:
                    - "What most don't realize is..."
                    - "The secret lies in..."
                    - "Based on my experience..."
                    - "After analyzing [X] cases..."
               
               d) 💎 VALUE BOMBS:
                  • Include 2-3 actionable takeaways
                  • Format as:
                    🔥 Key Insight 1
                    ⚡️ Key Insight 2
                    💡 Key Insight 3
               
               e) 🎬 VIRAL CLOSE:
                  • Ask a polarizing question
                  • Challenge conventional wisdom
                  • Prompt for experiences
                  • End with "Agree/Disagree?"

            3. 🎨 FORMATTING ESSENTIALS:
               • Break every 1-2 sentences
               • Use emojis strategically (not every line)
               • Bold key phrases with **asterisks**
               • Create visual hierarchy with spacing
               • Use → arrows for cause/effect
               • Add ... for dramatic pauses

            4. 🎭 EMOTIONAL TRIGGERS:
               • Controversy (challenge status quo)
               • Validation (shared struggles)
               • FOMO (exclusive insights)
               • Hope (achievable solutions)
               • Curiosity (unexpected twists)

            Language: ${language}
            Tone: ${tone} but conversational
            Audience: Ambitious professionals seeking growth

            Generate exactly ${numPosts} posts following this framework. Each post should feel authentic, valuable, and compelling enough to save and share.

            Start with [Post 1] and continue through [Post ${numPosts}]. Ensure each post is unique and tackles different aspects of "${prompt}".`,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      if (response && response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      } else {
        throw new Error('No response from OpenAI');
      }
    } catch (error) {
      this.logger.error('Error generating LinkedIn posts:', error);
      throw error;
    }
  }

  parseLinkedInPostsToJSON(content: string): LinkedInPost[] {
    const posts: LinkedInPost[] = [];
    
    // Split content by post markers
    const postSections = content.split(/### \[Post \d+\]/).filter(section => section.trim());

    postSections.forEach(section => {
      try {
        // Extract title and content
        const titleMatch = section.match(/\*\*Title: (.*?)\*\*/);
        const contentMatch = section.match(/\*\*Content:\*\*([\s\S]*?)(?=---|\n\n|$)/);

        if (titleMatch && contentMatch) {
          const title = titleMatch[1].trim();
          // Clean up the content: remove extra newlines, markdown, etc.
          const cleanContent = contentMatch[1]
            .trim()
            .replace(/\*\*/g, '') // Remove bold markers
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
            .replace(/^[\s\n]+|[\s\n]+$/g, ''); // Trim start and end

          if (title && cleanContent) {
            posts.push({
              title,
              content: cleanContent,
            });
          }
        }
      } catch (error) {
        this.logger.error('Error parsing post section:', error);
        // Continue with next section even if one fails
      }
    });

    // Log for debugging
    this.logger.debug(`Parsed ${posts.length} posts from content`);
    
    return posts;
  }
}
