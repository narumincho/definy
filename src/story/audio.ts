/**
 * 紹介スライド (/about/story) の効果音と BGM.
 * 音声ファイルは使わず, Web Audio API でその場で合成する.
 * ブラウザは利用者の操作の後でないと音を出させないので, 最初の操作で `resume()` を呼ぶ
 */

export type SoundEffect = "reveal" | "next" | "prev" | "finish";

/** BGM のテンポ (BPM) */
const BGM_TEMPO = 84;

/** BGM のコード進行. 1 コード 2 小節. 音は MIDI ノート番号 */
const BGM_CHORDS: ReadonlyArray<{
  readonly bass: number;
  readonly notes: readonly number[];
}> = [
  { bass: 45, notes: [60, 64, 67, 71] }, // Cmaj7 / A
  { bass: 41, notes: [57, 60, 64, 69] }, // Fmaj7 系
  { bass: 43, notes: [59, 62, 67, 69] }, // G6
  { bass: 40, notes: [55, 59, 64, 67] }, // Em7
];

function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export class StoryAudio {
  private context: AudioContext | undefined;
  private seGain: GainNode | undefined;
  private bgmGain: GainNode | undefined;
  private bgmTimer: ReturnType<typeof setInterval> | undefined;
  private nextBarTime = 0;
  private barIndex = 0;

  /** 利用者の操作の中で呼ぶ. AudioContext を作り, 止まっていれば再開する */
  resume(): void {
    if (this.context === undefined) {
      if (typeof AudioContext === "undefined") {
        return;
      }
      const context = new AudioContext();
      const seGain = context.createGain();
      seGain.gain.value = 0.35;
      seGain.connect(context.destination);
      const bgmGain = context.createGain();
      bgmGain.gain.value = 0;
      bgmGain.connect(context.destination);
      this.context = context;
      this.seGain = seGain;
      this.bgmGain = bgmGain;
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  playEffect(effect: SoundEffect): void {
    const context = this.context;
    const output = this.seGain;
    if (context === undefined || output === undefined) {
      return;
    }
    const now = context.currentTime;
    switch (effect) {
      case "reveal":
        this.blip(now, 880, 1320, 0.12, 0.5);
        return;
      case "prev":
        this.blip(now, 660, 440, 0.12, 0.4);
        return;
      case "next":
        this.whoosh(now);
        this.blip(now + 0.05, 523.25, 784, 0.18, 0.35);
        return;
      case "finish":
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          this.blip(now + index * 0.09, frequency, frequency, 0.6, 0.35);
        });
        return;
    }
  }

  /** 音程を変えながら鳴る短い音 */
  private blip(
    time: number,
    from: number,
    to: number,
    length: number,
    volume: number,
  ): void {
    const context = this.context;
    const output = this.seGain;
    if (context === undefined || output === undefined) {
      return;
    }
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(from, time);
    oscillator.frequency.exponentialRampToValueAtTime(to, time + length * 0.6);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    oscillator.connect(gain).connect(output);
    oscillator.start(time);
    oscillator.stop(time + length + 0.05);
  }

  /** 帯域を動かしたノイズ. スライドが切り替わるときの「シュッ」 */
  private whoosh(time: number): void {
    const context = this.context;
    const output = this.seGain;
    if (context === undefined || output === undefined) {
      return;
    }
    const length = 0.35;
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * length),
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(3200, time + length);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.25, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(filter).connect(gain).connect(output);
    source.start(time);
  }

  setBgm(on: boolean): void {
    const context = this.context;
    const bgmGain = this.bgmGain;
    if (context === undefined || bgmGain === undefined) {
      return;
    }
    const now = context.currentTime;
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
    if (on) {
      bgmGain.gain.linearRampToValueAtTime(0.16, now + 1.5);
      if (this.bgmTimer === undefined) {
        this.nextBarTime = now + 0.1;
        this.bgmTimer = setInterval(() => this.scheduleBgm(), 200);
        this.scheduleBgm();
      }
    } else {
      bgmGain.gain.linearRampToValueAtTime(0, now + 0.6);
      if (this.bgmTimer !== undefined) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = undefined;
      }
    }
  }

  /** 先の 1 秒ぶんの小節を予約する (setInterval のぶれで音がずれないように) */
  private scheduleBgm(): void {
    const context = this.context;
    if (context === undefined) {
      return;
    }
    const barLength = (4 * 60) / BGM_TEMPO;
    while (this.nextBarTime < context.currentTime + 1) {
      this.scheduleBar(this.barIndex, this.nextBarTime, barLength);
      this.nextBarTime += barLength;
      this.barIndex += 1;
    }
  }

  private scheduleBar(index: number, time: number, barLength: number): void {
    const chord = BGM_CHORDS[Math.floor(index / 2) % BGM_CHORDS.length];
    if (chord === undefined) {
      return;
    }
    const isChordStart = index % 2 === 0;
    if (isChordStart) {
      for (const note of chord.notes) {
        this.tone(time, note, barLength * 2, "triangle", 0.05, 0.9, 1400);
      }
    }
    this.tone(time, chord.bass, barLength * 0.9, "sine", 0.22, 0.05, 600);
    // 8 分音符のアルペジオ
    const eighth = barLength / 8;
    const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
    pattern.forEach((noteIndex, step) => {
      const note = chord.notes[noteIndex];
      if (note === undefined || (index % 4 === 3 && step >= 6)) {
        return;
      }
      this.tone(
        time + step * eighth,
        note + 12,
        eighth * 1.6,
        "sine",
        0.06,
        0.01,
        4000,
      );
    });
  }

  private tone(
    time: number,
    note: number,
    length: number,
    type: OscillatorType,
    volume: number,
    attack: number,
    cutoff: number,
  ): void {
    const context = this.context;
    const output = this.bgmGain;
    if (context === undefined || output === undefined) {
      return;
    }
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = midiToFrequency(note);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    oscillator.connect(filter).connect(gain).connect(output);
    oscillator.start(time);
    oscillator.stop(time + length + 0.05);
  }

  dispose(): void {
    if (this.bgmTimer !== undefined) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = undefined;
    }
    void this.context?.close();
    this.context = undefined;
    this.seGain = undefined;
    this.bgmGain = undefined;
  }
}
