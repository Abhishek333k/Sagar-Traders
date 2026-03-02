// --- SYNTHESIZER AUDIO ENGINE ---
const AudioEngine = {
    ctx: null,
    init: function() { 
        if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        if(this.ctx.state === 'suspended') this.ctx.resume(); 
    },
    playBeep: function() { 
        this.init(); const o=this.ctx.createOscillator(), g=this.ctx.createGain(); 
        o.connect(g); g.connect(this.ctx.destination); o.type='sine'; 
        o.frequency.setValueAtTime(1200, this.ctx.currentTime); 
        g.gain.setValueAtTime(0.1, this.ctx.currentTime); o.start(); o.stop(this.ctx.currentTime+0.1); 
    },
    playSuccess: function() { 
        this.init(); const o=this.ctx.createOscillator(), g=this.ctx.createGain(); 
        o.connect(g); g.connect(this.ctx.destination); o.type='triangle'; 
        o.frequency.setValueAtTime(500, this.ctx.currentTime); 
        o.frequency.linearRampToValueAtTime(1000, this.ctx.currentTime+0.1); 
        g.gain.setValueAtTime(0.1, this.ctx.currentTime); 
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime+0.5); 
        o.start(); o.stop(this.ctx.currentTime+0.5); 
    },
    playError: function() { 
        this.init(); const o=this.ctx.createOscillator(), g=this.ctx.createGain(); 
        o.connect(g); g.connect(this.ctx.destination); o.type='sawtooth'; 
        o.frequency.setValueAtTime(150, this.ctx.currentTime); 
        o.frequency.linearRampToValueAtTime(100, this.ctx.currentTime+0.2); 
        g.gain.setValueAtTime(0.1, this.ctx.currentTime); 
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime+0.2); 
        o.start(); o.stop(this.ctx.currentTime+0.2); 
    },
    playChime: function() { 
        this.init(); const o=this.ctx.createOscillator(), g=this.ctx.createGain(); 
        o.connect(g); g.connect(this.ctx.destination); o.type='sine'; 
        o.frequency.setValueAtTime(600, this.ctx.currentTime); 
        o.frequency.linearRampToValueAtTime(800, this.ctx.currentTime+0.1); 
        g.gain.setValueAtTime(0.05, this.ctx.currentTime); 
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime+0.3); 
        o.start(); o.stop(this.ctx.currentTime+0.3); 
    }
};