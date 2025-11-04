// src/lib/audioPlayer.ts
import swapConfirmationSound from '@/assets/swap-confirmation.mp3';

class AudioPlayer {
  private audio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio(swapConfirmationSound);
      this.audio.preload = 'auto';
    }
  }

  play() {
    if (this.audio) {
      // Reset to start if already playing
      this.audio.currentTime = 0;
      this.audio.play().catch(err => {
        console.warn('Audio playback failed:', err);
      });
    }
  }
}

export const swapAudioPlayer = new AudioPlayer();
