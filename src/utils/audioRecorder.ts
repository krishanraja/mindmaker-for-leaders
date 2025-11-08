export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private onDataAvailable: ((blob: Blob) => void) | null = null;

  async start(onDataCallback: (blob: Blob) => void): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm'
      });

      this.onDataAvailable = onDataCallback;
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        if (this.onDataAvailable) {
          this.onDataAvailable(audioBlob);
        }
        this.audioChunks = [];
      };

      this.mediaRecorder.start();
      console.log('AudioRecorder: Started recording');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      console.log('AudioRecorder: Stopped recording');
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
