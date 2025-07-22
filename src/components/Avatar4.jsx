// import { useState,  } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import React, {useEffect, useRef, useState, useCallback} from 'react'
import {useFrame, useGraph} from '@react-three/fiber'
import {useGLTF, useAnimations, useFBX} from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import {useControls, button} from "leva";
import * as THREE from "three";
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



// Map Azure viseme IDs to your model's morph target names
const azureVisemeMap = {
    0: 'viseme_sil', 1: 'viseme_PP', 2: 'viseme_AA', 3: 'viseme_O',
    4: 'viseme_E', 5: 'viseme_E', 6: 'viseme_I', 7: 'viseme_U',
    8: 'viseme_O', 9: 'viseme_O', 10: 'viseme_O', 11: 'viseme_I',
    12: 'viseme_TH', 13: 'viseme_RR', 14: 'viseme_l', 15: 'viseme_SS',
    16: 'viseme_CH', 17: 'viseme_TH', 18: 'viseme_FF', 19: 'viseme_DD',
    20: 'viseme_kk', 21: 'viseme_PP'
    // Note: You must adjust these string values (e.g., 'viseme_RR', 'viseme_l') to match your model's actual morph targets.
    // If a shape doesn't exist, map it to 'viseme_sil' or another neutral shape.
};


export function Avatar4(props) {

    const morphTargetSmoothing =  0.5;

    const [text, setText] = useState("I am Socrates AI! How can i assist you today?");
    const { speak, visemes, audio, isPlaying, isLoading } = useAzureTTS();

    useControls('Speech', {
        text: {
            value: text,
            onChange: setText, // This updates the state on input change
        },
        // Use the `button` helper for a cleaner setup
        speak: button(() => {
                if (!isLoading) {
                    speak(text); // Now `text` is always the latest value
                }
            }, { disabled: isLoading }
        ),
        status: {
            value: isLoading ? 'Synthesizing...' : (isPlaying ? 'Speaking...' : 'Idle'),
            editable: false
        }
    }, [text, isLoading]); // Dependency array forces the controls to update

    useFrame(() => {
        if (!isPlaying || !audio) {
            // Reset all visemes to 0 if not playing
            Object.values(azureVisemeMap).forEach((value) => {
                if (nodes.Head_Mesh001.morphTargetDictionary[value] !== undefined) {
                    nodes.Head_Mesh001.morphTargetInfluences[nodes.Head_Mesh001.morphTargetDictionary[value]] = 0;
                    nodes.Teeth_Mesh001.morphTargetInfluences[nodes.Teeth_Mesh001.morphTargetDictionary[value]] = 0;
                }
            });
            return;
        }

        const currentAudioTime = audio.currentTime * 1000; // in ms

        // Smoothly reset all morph targets
        Object.keys(nodes.Head_Mesh001.morphTargetDictionary).forEach((key) => {
            const index = nodes.Head_Mesh001.morphTargetDictionary[key];
            nodes.Head_Mesh001.morphTargetInfluences[index] = THREE.MathUtils.lerp(nodes.Head_Mesh001.morphTargetInfluences[index], 0, morphTargetSmoothing);
            nodes.Teeth_Mesh001.morphTargetInfluences[index] = THREE.MathUtils.lerp(nodes.Teeth_Mesh001.morphTargetInfluences[index], 0, morphTargetSmoothing);
        });

        // Find the current viseme and apply its influence
        let currentViseme = visemes.find(
            (v, i) =>
                currentAudioTime >= v.audioOffset &&
                (visemes[i + 1] ? currentAudioTime < visemes[i + 1].audioOffset : true)
        );

        if (currentViseme) {
            const visemeName = azureVisemeMap[currentViseme.visemeId];
            if (nodes.Head_Mesh001.morphTargetDictionary[visemeName]) {
                const headIndex = nodes.Head_Mesh001.morphTargetDictionary[visemeName];
                const teethIndex = nodes.Teeth_Mesh001.morphTargetDictionary[visemeName];
                nodes.Head_Mesh001.morphTargetInfluences[headIndex] = THREE.MathUtils.lerp(nodes.Head_Mesh001.morphTargetInfluences[headIndex], 1, morphTargetSmoothing);
                nodes.Teeth_Mesh001.morphTargetInfluences[teethIndex] = THREE.MathUtils.lerp(nodes.Teeth_Mesh001.morphTargetInfluences[teethIndex], 1, morphTargetSmoothing);
            }
        }
    });

    // --- Animation and Model Setup (No changes needed here) ---
    const { scene } = useGLTF('/models/fikrat-avatar-cut.glb');
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

    // const { animations: idleAnimation } = useFBX("/animations/Idle.fbx");
    // const { animations: greetingAnimation } = useFBX("/animations/Standing Greeting.fbx");
    // idleAnimation[0].name = "Idle";
    // greetingAnimation[0].name = "Greeting";
    //
    const group = useRef();
    // const { actions } = useAnimations([idleAnimation[0], greetingAnimation[0]], group);
    // const [animation, setAnimation] = useState("Idle");
    //
    // useEffect(() => {
    //     setAnimation(isPlaying ? "Greeting" : "Idle");
    // }, [isPlaying]);
    //
    // useEffect(() => {
    //     actions[animation]?.reset().fadeIn(0.5).play();
    //     return () => actions[animation]?.fadeOut(0.5);
    // }, [animation, actions]);

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