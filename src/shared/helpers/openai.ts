import OpenAI from 'openai';
export interface BackgroundColors {
  color1: string; // Background Color
  color2: string; // Text Color
  color3: string; // Tint Color
  color4: string; // Accent Color
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateCaruselContentFromTopic = async (
  topic: string,
  numSlides: number = 5,
  language: string = 'en',
  mood: string = 'neutral',
  contentStyle: string = 'Professional',
  targetAudience: string = 'General',
) => {
  try {
    const maxTokensPerSlide = 100;
    const maxTokens = Math.min(numSlides * maxTokensPerSlide, 1000);

    const response = await openai.chat.completions.create({
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
    console.error('Error generating carousel content:', error);
    throw error;
  }
};

export const generateCarouselColorPaletteFromPromptTopic = async (
  topic: string,
  theme: string,
) => {
  try {
    const response = await openai.chat.completions.create({
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
    console.error('Error generating color palette:', error);
    throw error;
  }
};

type Slide = {
  tagline?: string;
  title?: string;
  pagrgraph?: string;
  'Call to action'?: string;
};

const isValidSlideKey = (key: string): key is keyof Slide => {
  return ['type', 'tagline', 'title', 'description'].includes(key);
};

const isValidColorKey = (key: string): key is keyof BackgroundColors => {
  return ['color1', 'color2', 'color3', 'color4'].includes(key);
};

export const parseCarouselContentToJSON = (content: string): Slide[] => {
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
        if (isValidSlideKey(trimmedKey)) {
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
};

export const parseColorPaletteToJSON = (content: string): BackgroundColors => {
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
      if (isValidColorKey(trimmedKey)) {
        colors[trimmedKey] = value.join(':').trim();
      }
    }
  });
  return colors;
};
