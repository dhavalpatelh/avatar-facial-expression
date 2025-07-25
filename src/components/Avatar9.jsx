import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { useControls, button } from 'leva';
import * as THREE from 'three';

// ====================================================================================
// HOOK PERSONALIZZATO PER AZURE TEXT-TO-SPEECH (Nessuna modifica)
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
            console.error("Le credenziali di Azure Speech non sono impostate nei file di ambiente.");
            setIsLoading(false);
            return;
        }

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechSynthesisVoiceName = "it-IT-BenignoNeural";
        speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);
        
        const newVisemes = [];
        synthesizer.visemeReceived = (s, e) => {
            newVisemes.push({
                audioOffset: e.audioOffset / 10000,
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
                        URL.revokeObjectURL(url);
                    };
                } else {
                    console.error(`Sintesi fallita: ${result.errorDetails}`);
                    setIsLoading(false);
                }
                synthesizer.close();
            },
            (error) => {
                console.error(`Errore durante la sintesi vocale: ${error}`);
                setIsLoading(false);
                synthesizer.close();
            }
        );
    }, []);

    return { speak, visemes, audio, isPlaying, isLoading };
};

// ====================================================================================
// MAPPE DI CONFIGURAZIONE (Nessuna modifica)
// ====================================================================================
const azureVisemeMap = {
    0: 'viseme_sil', 1: 'viseme_PP', 2: 'viseme_aa', 3: 'viseme_O',
    4: 'viseme_E', 5: 'viseme_RR', 6: 'viseme_I', 7: 'viseme_U',
    8: 'viseme_O', 9: 'viseme_O', 10: 'viseme_O', 11: 'viseme_I',
    12: 'viseme_sil', 13: 'viseme_RR', 14: 'viseme_nn', 15: 'viseme_SS',
    16: 'viseme_CH', 17: 'viseme_TH', 18: 'viseme_FF', 19: 'viseme_DD',
    20: 'viseme_kk', 21: 'viseme_CH'
};

const visemeToFacialExpressionMap = {
    // eye wide and brow inner up
    2: { name: 'eyeWide', influence: 0.6, browExpression: 'browInnerUp', browInfluence: 0.8 },
    3: { name: 'eyeWide', influence: 0.4, browExpression: 'browInnerUp', browInfluence: 0.5 },
    // eye squint and brow down
    15: { name: 'eyeSquint', influence: 0.6, browExpression: 'browDown', browInfluence: 0.7 },
    16: { name: 'eyeSquint', influence: 0.7, browExpression: 'browDown', browInfluence: 0.8 },
    17: { name: 'eyeSquint', influence: 0.5, browExpression: 'browDown', browInfluence: 0.6 },
    20: { name: 'eyeSquint', influence: 0.8, browExpression: 'browDown', browInfluence: 0.9 },
};

// ====================================================================================
// COMPONENTE AVATAR FINALE (CODICE CORRETTO E COMPLETATO)
// ====================================================================================
export function Avatar9(props) {
    const morphTargetSmoothing = 0.5;

    const [text, setText] = useState(`Ciao, sono un avatar digitale di Fikrat Gasimov. Sono un ricercatore in Intelligenza Artificale.Come posso aiutarti oggi?`);
    const { speak, visemes, audio, isPlaying, isLoading } = useAzureTTS();

    const { scene } = useGLTF('/models/fikrat-avatar-cut.glb');
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

    useControls('Speech', {
        text: { value: text, onChange: setText },
        speak: button(() => { if (!isLoading) { speak(text); } }, { disabled: isLoading }),
        status: { value: isLoading ? 'Sintetizzando...' : (isPlaying ? 'Parlando...' : 'Inattivo'), editable: false }
    }, [text, isLoading, speak]);

    // Logica per il battito di ciglia automatico
    const blinkLeftName = 'eyeBlinkLeft';
    const blinkRightName = 'eyeBlinkRight';

    useEffect(() => {
        const head = nodes.Head_Mesh001;
        const eyelash = nodes.Eyelash_Mesh001;
        // La mesh EyeAO potrebbe avere anche un'animazione di battito di ciglia
        const eyeAO = nodes.EyeAO_Mesh001; 

        if (!head?.morphTargetDictionary) return;
        
        // Applica il battito di ciglia a tutte le mesh rilevanti
        const blinkMeshes = [head, eyelash, eyeAO].filter(mesh => mesh?.morphTargetDictionary?.[blinkLeftName]);

        let blinkTimeout;
        const triggerBlink = () => {
            blinkMeshes.forEach(mesh => {
                const blinkLeftIndex = mesh.morphTargetDictionary[blinkLeftName];
                const blinkRightIndex = mesh.morphTargetDictionary[blinkRightName];
                mesh.morphTargetInfluences[blinkLeftIndex] = 1;
                mesh.morphTargetInfluences[blinkRightIndex] = 1;
                setTimeout(() => {
                    mesh.morphTargetInfluences[blinkLeftIndex] = 0;
                    mesh.morphTargetInfluences[blinkRightIndex] = 0;
                }, 100);
            });
            blinkTimeout = setTimeout(triggerBlink, Math.random() * 4000 + 2000);
        };

        triggerBlink();
        return () => clearTimeout(blinkTimeout);
    }, [nodes]);

    // Loop di animazione, eseguito ad ogni frame
    useFrame((state) => {
        const head = nodes.Head_Mesh001;
        const teeth = nodes.Teeth_Mesh001;
        const tongue = nodes.Tongue_Mesh001;

        if (!head?.morphTargetDictionary || !teeth?.morphTargetDictionary || !tongue?.morphTargetDictionary) {
            return;
        }

        const allAnimatedMeshes = [head, teeth, tongue];
        // FASE 1: Resetta le influenze
        allAnimatedMeshes.forEach(mesh => {
            if (!mesh.morphTargetInfluences) return;
            Object.keys(mesh.morphTargetDictionary).forEach(key => {
                if (key !== blinkLeftName && key !== blinkRightName) {
                    const index = mesh.morphTargetDictionary[key];
                    mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
                        mesh.morphTargetInfluences[index], 0, morphTargetSmoothing
                    );
                }
            });
        });

        // FASE 2: Applica le animazioni del parlato
        if (isPlaying && audio) {
            const currentAudioTime = audio.currentTime;
            
            const currentViseme = visemes.find(
                (v, i) =>
                    currentAudioTime * 1000 >= v.audioOffset &&
                    (visemes[i + 1] ? currentAudioTime * 1000 < visemes[i + 1].audioOffset : true)
            );

            if (currentViseme) {
                const visemeName = azureVisemeMap[currentViseme.visemeId];
                
                // Anima bocca, denti e lingua
                allAnimatedMeshes.forEach(mesh => {
                    const morphIndex = mesh.morphTargetDictionary[visemeName];
                    if (morphIndex !== undefined) {
                        mesh.morphTargetInfluences[morphIndex] = 1;
                    }
                });

                // Anima occhi e sopracciglia SULLA MESH DELLA TESTA
                const expression = visemeToFacialExpressionMap[currentViseme.visemeId];
                if (expression) {
                    const dict = head.morphTargetDictionary; // <-- USA IL DIZIONARIO DELLA TESTA
                    
                    const leftEyeIndex = dict[`${expression.name}Left`];
                    const rightEyeIndex = dict[`${expression.name}Right`];
                    if (leftEyeIndex !== undefined) head.morphTargetInfluences[leftEyeIndex] = THREE.MathUtils.lerp(head.morphTargetInfluences[leftEyeIndex], expression.influence, morphTargetSmoothing);
                    if (rightEyeIndex !== undefined) head.morphTargetInfluences[rightEyeIndex] = THREE.MathUtils.lerp(head.morphTargetInfluences[rightEyeIndex], expression.influence, morphTargetSmoothing);

                    if (expression.browExpression) {
                        const browLeftIndex = dict[`${expression.browExpression}Left`];
                        const browRightIndex = dict[`${expression.browExpression}Right`];
                        if (browLeftIndex !== undefined) head.morphTargetInfluences[browLeftIndex] = THREE.MathUtils.lerp(head.morphTargetInfluences[browLeftIndex], expression.browInfluence, morphTargetSmoothing);
                        if (browRightIndex !== undefined) head.morphTargetInfluences[browRightIndex] = THREE.MathUtils.lerp(head.morphTargetInfluences[browRightIndex], expression.browInfluence, morphTargetSmoothing);
                    }
                }
            }
        }
        
       // FASE 3: Applica un movimento sottile allo sguardo
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
    );
}

useGLTF.preload('/models/fikrat-avatar-cut.glb');