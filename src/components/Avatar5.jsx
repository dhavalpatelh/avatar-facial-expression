// import { useState,  } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import React, {useEffect, useRef, useState, useCallback} from 'react'
import {useFrame, useGraph} from '@react-three/fiber'
import {useGLTF, useAnimations, useFBX} from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import {useControls, button} from "leva";
import * as THREE from "three";

/// this is custom azure avatar speaker component ////
// import { useAzureTTS } from "../hooks/useAzureTTS"; // Ensure this path is correct

const useAzureTTS = () => {
    const [visemes, setVisemes] = useState([]);
    const [audio, setAudio] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const speak = useCallback(async (text) => {
        setIsLoading(true);
        setVisemes([]);

        // 1. Get credentials from environment variables
        const speechKey = import.meta.env.VITE_APP_SPEECH_KEY;
        const speechRegion = import.meta.env.VITE_APP_SPEECH_REGION;

        if (!speechKey || !speechRegion) {
            console.error("Azure Speech credentials are not set in .env.local");
            setIsLoading(false);
            return;
        }

        // 2. Configure Speech SDK directly with subscription key
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechSynthesisVoiceName = "en-US-DavisNeural";
        speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

        const newVisemes = [];
        synthesizer.visemeReceived = (s, e) => {
            newVisemes.push({
                audioOffset: e.audioOffset / 10000, // Convert ticks to ms
                visemeId: e.visemeId,
            });
        };

        // 3. Synthesize speech and get audio data
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

 const azureVisemeMap = {
    0: 'viseme_sil', 1: 'viseme_PP', 2: 'viseme_AA', 3: 'viseme_O',
    4: 'viseme_E', 5: 'viseme_E', 6: 'viseme_I', 7: 'viseme_U', 
    8: 'viseme_O', 9: 'viseme_O', 10: 'viseme_O', 11: 'viseme_I',
    12: 'viseme_TH', 13: 'viseme_RR', 14: 'viseme_l', 15: 'viseme_SS',
    16: 'viseme_CH', 17: 'viseme_TH', 18: 'viseme_FF', 19: 'viseme_DD',
    20: 'viseme_kk', 21: 'viseme_PP'
}; 
 

export function Avatar5(props) {
    const morphTargetSmoothing =  0.5;
    const [text, setText] = useState("I am Socrates AI! How can i assist you today?");
    const { speak, visemes, audio, isPlaying, isLoading } = useAzureTTS();

    const { scene } = useGLTF('/models/fikrat-avatar-cut.glb');
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

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

        const blinkLeftIndex = nodes.Head_Mesh001.morphTargetDictionary[blinkLeftName];
        // --- FIX 1: Corretto il typo da 'morphTargeDictionary' a 'morphTargetDictionary' ---
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
            const nextBlinkDelay = Math.random() * 4000 + 2000;
            blinkTimeout = setTimeout(triggerBlink, nextBlinkDelay);
        };
        triggerBlink();
        return () => clearTimeout(blinkTimeout);
    }, [nodes.Head_Mesh001]);

    useFrame((state) => {
        if (!isPlaying || !audio) {
            // ... (logica per resettare i visemi quando non si parla)
            return;
        }

        const currentAudioTime = audio.currentTime; // in secondi

        // Interpola dolcemente tutti i morph target a 0, tranne quelli per il battito di ciglia
        Object.keys(nodes.Head_Mesh001.morphTargetDictionary).forEach((key) => {
            // --- FIX 2: Ignora i morph del battito di ciglia, perché sono gestiti da useEffect ---
            if (key !== blinkLeftName && key !== blinkRightName) {
                const index = nodes.Head_Mesh001.morphTargetDictionary[key];
                nodes.Head_Mesh001.morphTargetInfluences[index] = THREE.MathUtils.lerp(nodes.Head_Mesh001.morphTargetInfluences[index], 0, morphTargetSmoothing);
                if (nodes.Teeth_Mesh001.morphTargetDictionary[key] !== undefined) {
                    nodes.Teeth_Mesh001.morphTargetInfluences[nodes.Teeth_Mesh001.morphTargetDictionary[key]] = THREE.MathUtils.lerp(nodes.Teeth_Mesh001.morphTargetInfluences[nodes.Teeth_Mesh001.morphTargetDictionary[key]], 0, morphTargetSmoothing);
                }
            }
        });

        // Trova il visema corrente e applica la sua influenza
        let currentViseme = visemes.find(
            (v, i) =>
                currentAudioTime * 1000 >= v.audioOffset &&
                (visemes[i + 1] ? currentAudioTime * 1000 < visemes[i + 1].audioOffset : true)
        );

        if (currentViseme) {
            const visemeName = azureVisemeMap[currentViseme.visemeId];
            if (nodes.Head_Mesh001.morphTargetDictionary[visemeName]) {
                const headIndex = nodes.Head_Mesh001.morphTargetDictionary[visemeName];
                nodes.Head_Mesh001.morphTargetInfluences[headIndex] = THREE.MathUtils.lerp(nodes.Head_Mesh001.morphTargetInfluences[headIndex], 1, morphTargetSmoothing);
                
                if (nodes.Teeth_Mesh001.morphTargetDictionary[visemeName] !== undefined) {
                    const teethIndex = nodes.Teeth_Mesh001.morphTargetDictionary[visemeName];
                    nodes.Teeth_Mesh001.morphTargetInfluences[teethIndex] = THREE.MathUtils.lerp(nodes.Teeth_Mesh001.morphTargetInfluences[teethIndex], 1, morphTargetSmoothing);
                }
            }
        }

        // Logica per il movimento sottile degli occhi
        if (nodes.LeftEye && nodes.RightEye) {
            const time = state.clock.getElapsedTime();
            nodes.LeftEye.rotation.y = Math.sin(time * 0.5) * 0.08;
            nodes.LeftEye.rotation.x = Math.cos(time * 0.3) * 0.05;
            nodes.RightEye.rotation.y = Math.sin(time * 0.5) * 0.08;
            nodes.RightEye.rotation.x = Math.cos(time * 0.3) * 0.05;
        }
    });

    const group = useRef();
    
    // Il resto del codice per il rendering del modello rimane invariato
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