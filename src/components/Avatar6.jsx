// import { useState,  } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import React, {useEffect, useRef, useState, useCallback} from 'react'
import {useFrame, useGraph} from '@react-three/fiber'
import {useGLTF} from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import {useControls, button} from "leva";
import * as THREE from "three";

// ====================================================================================
// HOOK PERSONALIZZATO PER AZURE TEXT-TO-SPEECH
// (Nessuna modifica qui)
// ====================================================================================
const useAzureTTS = () => {
    const [visemes, setVisemes] = useState([]);
    const [audio, setAudio] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const speak = useCallback(async (text) => {
        setIsLoading(true);
        setVisemes([]);

        const speechKey = import.meta.env.VITE_APP_SPEECH_KEY;
        const speechRegion = import.meta.env.VITE_APP_SPEECH_REGION;

        if (!speechKey || !speechRegion) {
            console.error("Le credenziali di Azure Speech non sono impostate.");
            setIsLoading(false);
            return;
        }

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechSynthesisVoiceName = "en-US-DavisNeural";
        speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

        const newVisemes = [];
        synthesizer.visemeReceived = (s, e) => {
            newVisemes.push({
                audioOffset: e.audioOffset / 10000, // Converti in ms
                visemeId: e.visemeId,
            });
        };

        synthesizer.speakTextAsync(
            text,
            (result) => {
                if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    const audioData = result.audioData;
                    const blob = new Blob([audioData], { type: 'audio/mpeg' });
                    const url = URL.createObjectURL(blob);
                    const audioPlayer = new Audio(url);

                    audioPlayer.play();
                    setAudio(audioPlayer);
                    setVisemes(newVisemes);
                    setIsPlaying(true);
                    setIsLoading(false);

                    audioPlayer.onended = () => {
                        setIsPlaying(false);
                        setAudio(null);
                    };
                }
                synthesizer.close();
            },
            (error) => {
                console.error(error);
                setIsLoading(false);
                synthesizer.close();
            }
        );
    }, []);

    return { speak, visemes, audio, isPlaying, isLoading };
};


// ====================================================================================
// MAPPE DI CONFIGURAZIONE
// ====================================================================================

// Mappa gli ID dei visemi di Azure ai nomi dei morph target della bocca
/*  const azureVisemeMap = {
    0: 'viseme_sil', 1: 'viseme_PP', 2: 'viseme_AA', 3: 'viseme_O',
    4: 'viseme_E', 5: 'viseme_E', 6: 'viseme_I', 7: 'viseme_U', 
    8: 'viseme_O', 9: 'viseme_O', 10: 'viseme_O', 11: 'viseme_I',
    12: 'viseme_TH', 13: 'viseme_RR', 14: 'viseme_l', 15: 'viseme_SS',
    16: 'viseme_CH', 17: 'viseme_TH', 18: 'viseme_FF', 19: 'viseme_DD',
    20: 'viseme_kk', 21: 'viseme_PP'
};   */

const azureVisemeMap = {
    0: 'viseme_sil',    // Silenzio
    1: 'viseme_PP',     // Suoni: p, b, m
    2: 'viseme_AA',     // Suoni: æ, ə, ʌ (a aperta)
    3: 'viseme_O',      // Suoni: ɔ (o aperta)
    4: 'viseme_E',      // Suoni: ɛ, e, ɪ (e, i breve)
    5: 'viseme_RR',     // Suoni: ə, ɹ ("er"). 'RR' è spesso un buon sostituto se manca 'er'.
    6: 'viseme_I',      // Suoni: i, j (i lunga)
    7: 'viseme_U',      // Suoni: u, w (u lunga)
    8: 'viseme_O',      // Suoni: o
    9: 'viseme_O',      // Suoni: aʊ (ow). Semplificato in 'O'.
    10: 'viseme_O',     // Suoni: ɔɪ (oy). Semplificato in 'O'.
    11: 'viseme_I',     // Suoni: aɪ (eye). Semplificato in 'I'.
    12: 'viseme_sil',    // Suoni: h. CORRETTO: Mappato a silenzio per evitare movimenti errati della lingua.
    13: 'viseme_RR',     // Suoni: ɹ (r)
    14: 'viseme_l',      // Suoni: l
    15: 'viseme_SS',     // Suoni: s, z
    16: 'viseme_CH',     // Suoni: ʃ, ʒ, tʃ, dʒ (sh, ch, j)
    17: 'viseme_TH',     // Suoni: ð, θ (th)
    18: 'viseme_FF',     // Suoni: f, v
    19: 'viseme_DD',     // Suoni: d, t, n
    20: 'viseme_kk',     // Suoni: k, g, ŋ (k, g, ng)
    21: 'viseme_CH'      // Suoni: tʃ (ch). CORRETTO: Mappato a 'CH' invece di 'PP'.
}; 
// --- NUOVO: Mappa i visemi a espressioni oculari aggiuntive ---
// Associa un ID visema a un'espressione oculare e alla sua intensità.
// Puoi personalizzare questi valori per ottenere l'effetto desiderato.
const visemeToEyeExpressionMap = {
    // Visemi per suoni aperti -> Spalanca leggermente gli occhi per dare enfasi
    2: { name: 'eyeWide', influence: 0.4 },  // AA (es. "father")
    3: { name: 'eyeWide', influence: 0.3 },  // O  (es. "oh")

    // Visemi per suoni duri o sibilanti -> Strizza leggermente gli occhi per simulare sforzo
    15: { name: 'eyeSquint', influence: 0.5 }, // SS (es. "smile")
    16: { name: 'eyeSquint', influence: 0.6 }, // CH (es. "cheese")
    17: { name: 'eyeSquint', influence: 0.4 }, // TH (es. "think")
    20: { name: 'eyeSquint', influence: 0.7 }, // kk (es. "cat")
};

// ====================================================================================
// COMPONENTE AVATAR
// ====================================================================================
export function Avatar6(props) {
    const morphTargetSmoothing =  0.5;
    const [text, setText] = useState("I am Socrates AI! How can i assist you today?");
    const { speak, visemes, audio, isPlaying, isLoading } = useAzureTTS();

    const { scene } = useGLTF('/models/fikrat-avatar-cut.glb');
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

    // Controlli Leva solo per la sintesi vocale
    useControls('Speech', {
        text: { value: text, onChange: setText },
        speak: button(() => { if (!isLoading) { speak(text); } }, { disabled: isLoading }),
        status: { value: isLoading ? 'Synthesizing...' : (isPlaying ? 'Speaking...' : 'Idle'), editable: false }
    }, [text, isLoading]);

    // Nomi dei morph target per il battito di ciglia
    const blinkLeftName = 'eyeBlinkLeft';
    const blinkRightName = 'eyeBlinkRight';

    // Logica per il battito di ciglia automatico
    useEffect(() => {
        if (!nodes.Head_Mesh001?.morphTargetDictionary) return;

        // Corretto il typo qui
        const blinkLeftIndex = nodes.Head_Mesh001.morphTargetDictionary[blinkLeftName];
        const blinkRightIndex = nodes.Head_Mesh001.morphTargetDictionary[blinkRightName];

        if (blinkLeftIndex === undefined || blinkRightIndex === undefined) {
            console.warn(`Attenzione: Morph target per il battito di ciglia non trovati: '${blinkLeftName}', '${blinkRightName}'.`);
            return;
        }

        let blinkTimeout;
        const triggerBlink = () => {
            if (nodes.Head_Mesh001.morphTargetInfluences) {
                nodes.Head_Mesh001.morphTargetInfluences[blinkLeftIndex] = 1;
                nodes.Head_Mesh001.morphTargetInfluences[blinkRightIndex] = 1;
                setTimeout(() => {
                    nodes.Head_Mesh001.morphTargetInfluences[blinkLeftIndex] = 0;
                    nodes.Head_Mesh001.morphTargetInfluences[blinkRightIndex] = 0;
                }, 150);
            }
            blinkTimeout = setTimeout(triggerBlink, Math.random() * 4000 + 2000);
        };
        triggerBlink();
        return () => clearTimeout(blinkTimeout);
    }, [nodes.Head_Mesh001]); // Dipende dal caricamento dei nodi del modello

    // Loop di animazione eseguito ad ogni frame
    useFrame((state) => {
        // Se il modello non è ancora caricato, non fare nulla
        if (!nodes.Head_Mesh001?.morphTargetDictionary) return;

        const influences = nodes.Head_Mesh001.morphTargetInfluences;
        const dict = nodes.Head_Mesh001.morphTargetDictionary;

        // Fase 1: Resetta dolcemente le influenze delle espressioni (bocca e occhi) a 0.
        // Questo evita che le espressioni restino "bloccate".
        Object.keys(dict).forEach(key => {
            // Ignoriamo i morph del battito di ciglia, gestiti da useEffect
            if (key !== blinkLeftName && key !== blinkRightName) {
                influences[dict[key]] = THREE.MathUtils.lerp(influences[dict[key]], 0, morphTargetSmoothing);
            }
        });

        // Fase 2: Se l'audio è in riproduzione, applica le animazioni
        if (isPlaying && audio) {
            const currentAudioTime = audio.currentTime;
            
            // Trova il visema corrente
            const currentViseme = visemes.find(
                (v, i) =>
                    currentAudioTime * 1000 >= v.audioOffset &&
                    (visemes[i + 1] ? currentAudioTime * 1000 < visemes[i + 1].audioOffset : true)
            );

            if (currentViseme) {
                // 2a: Anima la BOCCA
                const visemeName = azureVisemeMap[currentViseme.visemeId];
                const headIndex = dict[visemeName];
                if (headIndex !== undefined) {
                    influences[headIndex] = THREE.MathUtils.lerp(influences[headIndex], 1, morphTargetSmoothing);
                }

                // 2b: Anima gli OCCHI in base al suono
                const expression = visemeToEyeExpressionMap[currentViseme.visemeId];
                if (expression) {
                    const { name, influence } = expression;
                    const leftEyeIndex = dict[`${name}Left`];   // es. 'eyeSquintLeft'
                    const rightEyeIndex = dict[`${name}Right`]; // es. 'eyeSquintRight'

                    if (leftEyeIndex !== undefined) {
                        influences[leftEyeIndex] = THREE.MathUtils.lerp(influences[leftEyeIndex], influence, morphTargetSmoothing);
                    }
                    if (rightEyeIndex !== undefined) {
                        influences[rightEyeIndex] = THREE.MathUtils.lerp(influences[rightEyeIndex], influence, morphTargetSmoothing);
                    }
                }
            }
        }
        
        // Fase 3: Applica un movimento sottile allo sguardo per renderlo più naturale
        if (nodes.LeftEye && nodes.RightEye) {
            const time = state.clock.getElapsedTime();
            nodes.LeftEye.rotation.y = Math.sin(time * 0.5) * 0.08;
            nodes.LeftEye.rotation.x = Math.cos(time * 0.3) * 0.05;
            nodes.RightEye.rotation.y = Math.sin(time * 0.5) * 0.08;
            nodes.RightEye.rotation.x = Math.cos(time * 0.3) * 0.05;
        }
    });

    const group = useRef();
    
    // JSX per il rendering del modello
    return (
        <group {...props} dispose={null} ref={group}>
            <group name="Scene">
                <group name="Armature">
                    <primitive object={nodes.Hips} />
                    <skinnedMesh name="avaturn_hair_0" geometry={nodes.avaturn_hair_0.geometry} material={materials.avaturn_hair_0_material} skeleton={nodes.avaturn_hair_0.skeleton} />
                    <skinnedMesh name="avaturn_look_0" geometry={nodes.avaturn_look_0.geometry} material={materials.avaturn_look_0_material} skeleton={nodes.avaturn_look_0.skeleton} />
                    <skinnedMesh name="Eye_Mesh001" geometry={nodes.Eye_Mesh001.geometry} material={materials.Eyes} skeleton={nodes.Eye_Mesh001.skeleton} morphTargetDictionary={nodes.Eye_Mesh001.morphTargetDictionary} morphTargetInfluences={nodes.Eye_Mesh001.morphTargetInfluences} />
                    <skinnedMesh name="EyeAO_Mesh001" geometry={nodes.EyeAO_Mesh001.geometry} material={materials.EyeAO} skeleton={nodes.EyeAO_Mesh001.skeleton} morphTargetDictionary={nodes.EyeAO_Mesh001.morphTargetDictionary} morphTargetInfluences={nodes.EyeAO_Mesh001.morphTargetInfluences} />
                    <skinnedMesh name="Eyelash_Mesh001" geometry={nodes.Eyelash_Mesh001.geometry} material={materials.Eyelash} skeleton={nodes.Eyelash_Mesh001.skeleton} morphTargetDictionary={nodes.Eyelash_Mesh001.morphTargetDictionary} morphTargetInfluences={nodes.Eyelash_Mesh001.morphTargetInfluences} />
                    <skinnedMesh name="Head_Mesh001" geometry={nodes.Head_Mesh001.geometry} material={materials.Head} skeleton={nodes.Head_Mesh001.skeleton} morphTargetDictionary={nodes.Head_Mesh001.morphTargetDictionary} morphTargetInfluences={nodes.Head_Mesh001.morphTargetInfluences} />
                    <skinnedMesh name="Teeth_Mesh001" geometry={nodes.Teeth_Mesh001.geometry} material={materials.Teeth} skeleton={nodes.Teeth_Mesh001.skeleton} morphTargetDictionary={nodes.Teeth_Mesh001.morphTargetDictionary} morphTargetInfluences={nodes.Teeth_Mesh001.morphTargetInfluences} />
                    <skinnedMesh name="Tongue_Mesh001" geometry={nodes.Tongue_Mesh001.geometry} material={materials['Teeth.001']} skeleton={nodes.Tongue_Mesh001.skeleton} morphTargetDictionary={nodes.Tongue_Mesh001.morphTargetDictionary} morphTargetInfluences={nodes.Tongue_Mesh001.morphTargetInfluences} />
                </group>
            </group>
        </group>
    )
}

useGLTF.preload('/models/fikrat-avatar-cut.glb');