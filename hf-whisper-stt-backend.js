import { pipeline } from '@huggingface/transformers';

export class RealTimeSpeechRecognition {
    constructor() {
        this.pipe = null;
        this.audioContext = null;
        this.audioWorkletNode = null;
        this.mediaStream = null;
        this.isListening = false;
    }

    async initialize() {
        console.log('Loading speech recognition model...');
        this.pipe = await pipeline('automatic-speech-recognition', 'distil-whisper/distil-large-v3');
        console.log('Model loaded successfully!');
    }

    async startListening() {
        if (!this.pipe) {
            await this.initialize();
        }

        try {
            // Get microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });

            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Create media source from stream
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Load the AudioWorklet processor
            await this.audioContext.audioWorklet.addModule('./speech-processor.js');

            // Create AudioWorkletNode
            this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'speech-processor');

            // Listen for processed audio data
            this.audioWorkletNode.port.onmessage = async (event) => {
                const { type, data, sampleRate } = event.data;
                
                if (type === 'audioData') {
                    console.log('Received audio data chunk from worklet.'); // Log 1
                    await this.processAudioData(data, sampleRate);
                }
            };

            // Connect the audio graph
            source.connect(this.audioWorkletNode);
            // Note: Don't connect to destination to avoid feedback
            
            this.isListening = true;
            console.log('Real-time listening started...');

        } catch (error) {
            console.error('Error starting real-time recognition:', error);
            throw error;
        }
    }

    async processAudioData(audioData, sampleRate) {
        try {
            const isSpeaking = this.hasSpeech(audioData);
            const average = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
            console.log(`[Speech-Check] Average audio level: ${average.toFixed(6)}. Speaking: ${isSpeaking}`); // Log 2

            if (!isSpeaking) {
                return;
            }

            console.log('Processing audio chunk with the speech recognition model...'); // Log 3
            const result = await this.pipe(audioData);
            console.log('Pipeline result:', result); // Log 4

            if (result.text && result.text.trim().length > 0) {
                this.onTranscription(result.text);
            }

        } catch (error) {
            console.error('Error processing audio data:', error);
        }
    }

    // Simple speech detection
    hasSpeech(audioData) {
        const threshold = 0.01;
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += Math.abs(audioData[i]);
        }
        const average = sum / audioData.length;
        return average > threshold;
    }

    stopListening() {
        try {
            if (this.audioWorkletNode) {
                this.audioWorkletNode.disconnect();
                this.audioWorkletNode = null;
            }

            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }

            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.close();
                this.audioContext = null;
            }

            this.isListening = false;
            console.log('Real-time listening stopped.');
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }

    onTranscription(text) {
        console.log(`Transcription received: "${text}"`); // Log 5
        const outputElement = document.getElementById('live-transcription');
        if (outputElement) {
            console.log('Found output element. Appending text.');
            outputElement.textContent += text + ' ';
        } else {
            console.warn('Could not find element with id="live-transcription" to display output.');
        }
    }
}
