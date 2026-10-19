#!/usr/bin/env python3
"""Original BREACH audio. Deterministic additive/subtractive synthesis, no sampled recordings.
Requires Python 3 + NumPy. Generated 16-bit PCM WAV files are committed; runtime needs no Python.
"""
from pathlib import Path
import json, wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]/'public'/'audio'
SR=22050
rng=np.random.default_rng(48371)
manifest={}
def write(name, category, samples, loop=False):
    samples=np.asarray(samples)
    peak=float(np.max(np.abs(samples)))
    if peak>0: samples=samples/max(1,peak/0.86)
    path=ROOT/category/(name+'.wav');path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(samples,-1,1)*32767).astype('<i2').tobytes())
    manifest[name]={'file':f'audio/{category}/{name}.wav','category':category,'duration':round(len(samples)/SR,3),'loop':loop,'peak':round(peak,4),'license':'CC0-1.0'}
def tone(t,f):return np.sin(2*np.pi*f*t)
def effect(name, category, freq=200, length=.25, noise=.25, variant=0):
    t=np.arange(int(SR*length))/SR
    n=rng.uniform(-1,1,len(t)); n=np.convolve(n,np.ones(3)/3,'same')
    env=np.exp(-t*(6/length))*np.minimum(1,t/.002)
    x=(tone(t,freq*(1-.28*t/length))*.42+tone(t,freq*1.503)*.12+n*noise)*env
    if variant: x+=tone(t,freq*2)*np.exp(-((t-length*.65)/(.035+length*.1))**2)*.14
    x[-100:]*=np.linspace(1,0,min(100,len(x)))
    write(name,category,x)
# Layered weapon transients: pressure pulse, filtered noise, metallic cycling and tail.
for name,f,length,no in [('pistol',155,.24,1),('smg',210,.12,.85),('shotgun',65,.65,1.2),('rocket',48,.9,.85),('railgun',920,.65,.24)]:
    t=np.arange(int(SR*length))/SR;n=rng.uniform(-1,1,len(t));low=np.convolve(n,np.ones(14)/14,'same')
    x=(np.sin(2*np.pi*(f*t+25*(1-np.exp(-t*40))))*.5+(n*.45+low*.8)*no)*np.exp(-t*(8/length))
    x+=tone(t,1900 if name!='railgun' else 3300)*np.exp(-((t-.008)/.004)**2)*.2
    x+=rng.uniform(-1,1,len(t))*.13*np.exp(-((t-length*.65)/.018)**2)
    if name=='railgun':x+=np.sin(2*np.pi*(1800*t-1100*t*t))*np.exp(-t*8)*.35
    x*=np.minimum(1,t/.001);x[-200:]*=np.linspace(1,0,200);write(name,'weapons',x)
for name,f in [('barrel',120),('grenade',450),('barricade',85),('mine',1150),('remote',760),('remote-trigger',1500),('mine-trigger',1800),('grenade-bounce',350),('barrel-hit',150),('barricade-hit',115),('barricade-break',60),('weapon-switch',500),('empty',950),('upgrade',660)]:effect(name,'weapons',f,.3,.5,1)
t=np.arange(SR*2)/SR;n=rng.uniform(-1,1,len(t));low=np.convolve(n,np.ones(35)/35,'same')
x=(tone(t,45*np.exp(-t*.6))*.65+low*2+n*.1)*np.exp(-t*3.8)
x+=np.convolve(rng.uniform(-1,1,len(t)),np.ones(8)/8,'same')*.3*np.exp(-((t-.32)/.16)**2);x*=np.minimum(1,t/.003);write('explosion','weapons',x)
for name,f in [('stone',620),('wood',180),('metal',1700),('ground',90),('water',440)]:effect('impact-'+name,'weapons',f,.15,.8)
for i,name in enumerate(['walker','runner','brute','ranged','saboteur','scavenger','guardian','bomber','boss']):
    for j,action in enumerate(['spawn','idle','attack','hit','death']):
        effect(f'{name}-{action}','enemies',55+i*34+j*17,.22+j*.08,.45,j%2)
for name,f in [('boss-phase',65),('boss-defeat',180),('bomber-warning',1000)]:effect(name,'enemies',f,1.2,.5,1)
for name,f in [('step-stone',160),('step-metal',620),('step-ground',90),('dash',880),('player-hit',85),('player-death',50),('low-health',110),('respawn',580),('shield-hit',1200),('power-expire',350),('drone',1350)]:effect(name,'player',f,.12 if name.startswith('step') else .5,.55,1)
for i,name in enumerate(['health','ammo','shield','damage','speed','rapid','shockwave','multiplier','drone','equipment']):effect('pickup-'+name,'player',330+i*67,.5,.08,1)
for i,name in enumerate(['objective-alert','sabotage-start','sabotage-interrupt','relay-disabled','objective-restored','resource-collected','resource-stolen','extraction','wave','victory','defeat']):effect(name,'voice',220+i*72,.75,.12,1)
for name,f in [('ui-hover',640),('ui-click',800),('ui-back',420)]:effect(name,'ui',f,.08,.02)
# Looping ambient beds: different wind/water spectra, machinery and synthesized birds.
for i,name in enumerate(['taj','hawa','fort','hampi','gateway','mysore']):
    t=np.arange(SR*8)/SR;n=rng.normal(0,.15,len(t));wind=np.convolve(n,np.ones(100+i*20)/(100+i*20),'same')
    x=wind*(1+.35*np.sin(2*np.pi*t/8))+.016*tone(t,40+i*12)
    if name in ['taj','gateway']:x+=np.convolve(rng.normal(0,.15,len(t)),np.ones(8)/8,'same')*(.2+.15*tone(t,.5))
    if name in ['taj','hampi','gateway']:
        for s in [1.1,3.3,6.2]:x+=np.sin(2*np.pi*(1800*t+80*np.sin(2*np.pi*7*t)))*np.exp(-((t-s)/.09)**2)*.05
    if name in ['hawa','mysore']:x+=(tone(t,220)+tone(t,330))*.008*(1+tone(t,.25))
    x[:500]*=np.linspace(0,1,500);x[-500:]*=np.linspace(1,0,500);write('ambient-'+name,'environment',x,True)
# Original 8-bar modal synth compositions. Every note has a decaying envelope;
# wrap-around mixing preserves delay tails across the exact musical loop boundary.
STATES={'menu':(108,0,.55),'selection':(96,5,.25),'calm':(112,0,.65),'medium':(120,2,.78),'intense':(132,0,1),'boss':(140,-5,1.1),'suspense':(106,1,.4),'victory':(120,7,.7),'defeat':(80,-5,.2),'credits':(100,5,.35)}
for name,(bpm,transpose,intensity) in STATES.items():
    beat=60/bpm;length=beat*32;size=round(length*SR);mix=np.zeros(size)
    def add(samples,start,level=1):
        ids=(int(start*SR)+np.arange(len(samples)))%size
        np.add.at(mix,ids,samples*level)
    def note(midi,duration,bright=.2):
        t=np.arange(int(duration*SR))/SR;f=440*2**((midi-69)/12)
        return (tone(t,f)+bright*tone(t,f*2)+.12*tone(t,f*3))*np.exp(-t/(duration*.25))*np.minimum(1,t/.009)
    chords=[0,-3,-5,-2];melody=[0,7,12,10,7,3,5,7,0,3,10,7,14,12,7,5]
    for bar in range(8):
        root=45+transpose+chords[bar%4]
        for interval in [0,7,12,15]:
            t=np.arange(int(beat*4*SR))/SR
            pad=note(root+12+interval,beat*5,.08)*.035
            add(pad,bar*4*beat)
        for step in range(8):
            when=(bar*4+step*.5)*beat
            add(note(root+(12 if step%4==3 else 0),beat*.65,.3),when,.12)
            midi=57+transpose+melody[(bar*3+step)%len(melody)]
            voice=note(midi,beat*.6,.32)
            add(voice,when,.07);add(voice,when+beat*.75,.026);add(voice,when+beat*1.5,.013)
        for b in range(4):
            when=(bar*4+b)*beat;t=np.arange(int(.32*SR))/SR
            kick=np.sin(2*np.pi*(45*t+3*(1-np.exp(-t*35))))*np.exp(-t*15)
            add(kick,when,.3*intensity)
            if b%2:
                t=np.arange(int(.2*SR))/SR;snare=(rng.uniform(-1,1,len(t))*.7+tone(t,180)*.2)*np.exp(-t*22)
                add(snare,when,.15*intensity)
            for half in range(2 if intensity<.8 else 4):
                t=np.arange(int(.06*SR))/SR;hat=rng.uniform(-1,1,len(t))*np.exp(-t*65)
                add(hat,when+half*beat/(2 if intensity<.8 else 4),.035*intensity)
    mix=np.tanh(mix*1.35)*.78
    write('music-'+name,'music',mix,True)
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Generated {len(manifest)} original PCM WAV assets, {sum(p.stat().st_size for p in ROOT.rglob("*.wav"))/1e6:.1f} MB')
