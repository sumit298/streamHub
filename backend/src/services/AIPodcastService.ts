import GeminiService from './GeminiService.js';
import TTSService from './TTSService.js';
import path from 'path';
import fs from 'fs';

interface PodcastInput {
  topic: string;
  voice: 'male' | 'female' | 'british';
  duration: '5min' | '10min' | '15min';
  knowledgeBase?: string;
  userId: string;
}

interface PodcastTurn {
  speaker: 'A' | 'B';
  text: string;
  audioPath?: string;
  audioBuffer?: Buffer;
}

interface PodcastResult {
  podcastId: string;
  script: PodcastTurn[];
  status: 'generating' | 'ready' | 'failed';
}

class AIPodcastService {
  private recordingsDir: string;

  constructor() {
    this.recordingsDir = path.join(process.cwd(), 'recordings', 'ai-podcasts');
    this.ensureDirectoryExists(this.recordingsDir);
  }

  private ensureDirectoryExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async generate(input: PodcastInput): Promise<PodcastResult> {
    const podcastId = `podcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const podcastDir = path.join(this.recordingsDir, podcastId);
    
    this.ensureDirectoryExists(podcastDir);

    try {
      console.log(`[AI-PODCAST] Generating podcast: ${podcastId}`);
      console.log(`[AI-PODCAST] Topic: ${input.topic}`);
      console.log(`[AI-PODCAST] Duration: ${input.duration}`);
      
      // Step 1: Generate script with Gemini
      console.log('[AI-PODCAST] Step 1: Generating script with Gemini...');
      const script = await GeminiService.generateScript({
        topic: input.topic,
        duration: input.duration,
        knowledgeBase: input.knowledgeBase,
      });
      
      console.log(`[AI-PODCAST] Script generated with ${script.length} turns`);

      // Step 2: Generate audio for each turn
      console.log('[AI-PODCAST] Step 2: Generating audio with Google TTS...');
      const scriptWithAudio: PodcastTurn[] = [];

      for (let i = 0; i < script.length; i++) {
        const turn = script[i];
        console.log(`[AI-PODCAST] Generating audio for turn ${i + 1}/${script.length} (Speaker ${turn.speaker})`);
        
        // Alternate voices for different speakers
        const voice = turn.speaker === 'A' ? input.voice : (input.voice === 'male' ? 'female' : 'male');
        
        const audioBuffer = await TTSService.synthesize(turn.text, { voice });
        const audioFileName = `turn-${i}-speaker-${turn.speaker}.mp3`;
        const audioPath = path.join(podcastDir, audioFileName);
        
        // Save to file
        fs.writeFileSync(audioPath, audioBuffer);
        
        scriptWithAudio.push({
          ...turn,
          audioPath,
          audioBuffer,
        });
      }

      console.log(`[AI-PODCAST] Podcast generated successfully: ${podcastId}`);

      return {
        podcastId,
        script: scriptWithAudio,
        status: 'ready',
      };
    } catch (error) {
      console.error(`[AI-PODCAST] Generation failed:`, error);
      throw error;
    }
  }

  getPodcastPath(podcastId: string): string {
    return path.join(this.recordingsDir, podcastId);
  }

  async cleanup(podcastId: string): Promise<void> {
    const podcastPath = this.getPodcastPath(podcastId);
    if (fs.existsSync(podcastPath)) {
      fs.rmSync(podcastPath, { recursive: true, force: true });
      console.log(`[AI-PODCAST] Cleaned up podcast: ${podcastId}`);
    }
  }
}

export default new AIPodcastService();
