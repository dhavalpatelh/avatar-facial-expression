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
// MAPPE DI CONFIGURAZIONE (AGGIORNATE CON LE GUANCE)
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
    // Vocali aperte -> sopracciglia alzate
    2: { name: 'eyeWide', influence: 0.6, browExpression: 'browInnerUp', browInfluence: 0.8 }, // aa
    3: { name: 'eyeWide', influence: 0.4, browExpression: 'browInnerUp', browInfluence: 0.5 }, // O

    // Vocali strette / sorrisi -> strizzare le guance
    4: { cheekExpression: 'cheekSquint', cheekInfluence: 0.8 }, // E
    6: { cheekExpression: 'cheekSquint', cheekInfluence: 1.0 }, // I
    
    // Suoni labiali -> gonfiare le guance
    1: { cheekExpression: 'cheekPuff', cheekInfluence: 0.7 }, // PP
    18: { cheekExpression: 'cheekPuff', cheekInfluence: 0.5 }, // FF

    // Consonanti forti -> strizzare gli occhi, abbassare le sopracciglia, e strizzare le guance
    15: { name: 'eyeSquint', influence: 0.6, browExpression: 'browDown', browInfluence: 0.7, cheekExpression: 'cheekSquint', cheekInfluence: 0.5 }, // SS
    16: { name: 'eyeSquint', influence: 0.7, browExpression: 'browDown', browInfluence: 0.8, cheekExpression: 'cheekSquint', cheekInfluence: 0.6 }, // CH
    17: { name: 'eyeSquint', influence: 0.5, browExpression: 'browDown', browInfluence: 0.6 }, // TH
    20: { name: 'eyeSquint', influence: 0.8, browExpression: 'browDown', browInfluence: 0.9, cheekExpression: 'cheekSquint', cheekInfluence: 0.4 }, // kk
};


// ====================================================================================
// COMPONENTE AVATAR FINALE (CODICE CORRETTO E COMPLETATO)
// ====================================================================================
export function Avatar11(props) {
    const morphTargetSmoothing = 0.5;

    const [eyeTarget, setEyeTarget] = useState(new THREE.Vector2(0, 0)); // Add this state

    const [text, setText] = useState(`11 11 11 Ciao, sono un avatar digitale di Fikrat Gasimov. Sono un ricercatore in Intelligenza Artificale.Come posso aiutarti oggi?`);
    const { speak, visemes, audio, isPlaying, isLoading } = useAzureTTS();

    const { scene } = useGLTF('/models/fikrat-avatar-cut.glb');
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

    // Add this line to see the correct names in the browser's developer console
    console.log("Head Morph Targets:", nodes.Head_Mesh001.morphTargetDictionary);
    console.log("Eyelid AO Morph Targets:", nodes.EyeAO_Mesh001.morphTargetDictionary);
    console.log("Eyelash Morph Targets:", nodes.Eyelash_Mesh001.morphTargetDictionary);


    useControls('Speech', {
        text: { value: text, onChange: setText },
        speak: button(() => { if (!isLoading) { speak(text); } }, { disabled: isLoading }),
        status: { value: isLoading ? 'Sintetizzando...' : (isPlaying ? 'Parlando...' : 'Inattivo'), editable: false }
    }, [text, isLoading, speak]);

    // Logica per il battito di ciglia automatico
    const blinkLeftName = 'eyeBlinkLeft';
    const blinkRightName = 'eyeBlinkRight';

    useEffect(() => {
        // --- CORRECTED LOGIC ---
        // Define all the meshes that should be part of the blink.
        const meshesToBlink = [
            nodes.Head_Mesh001,
            nodes.Eyelash_Mesh001,
            nodes.EyeAO_Mesh001
        ];

        let blinkTimeout;

        const triggerBlink = () => {
            // Iterate over each mesh and apply the blink if the morph target exists.
            meshesToBlink.forEach(mesh => {
                if (!mesh?.morphTargetDictionary) return; // Skip if the mesh has no morphs

                const blinkLeftIndex = mesh.morphTargetDictionary[blinkLeftName];
                const blinkRightIndex = mesh.morphTargetDictionary[blinkRightName];

                // Only apply animation if both left and right blink morphs are found on THIS mesh.
                if (blinkLeftIndex !== undefined && blinkRightIndex !== undefined) {
                    mesh.morphTargetInfluences[blinkLeftIndex] = 1;
                    mesh.morphTargetInfluences[blinkRightIndex] = 1;

                    setTimeout(() => {
                        mesh.morphTargetInfluences[blinkLeftIndex] = 0;
                        mesh.morphTargetInfluences[blinkRightIndex] = 0;
                    }, 150);
                }
            });

            // Set the timeout for the next blink
            // blinkTimeout = setTimeout(triggerBlink, Math.random() * 4000 + 2000);
            blinkTimeout = setTimeout(triggerBlink, Math.random() * 4000 + 2000);
        };

        triggerBlink();

        return () => clearTimeout(blinkTimeout);
    }, [nodes]); // Dependency array remains the same

    // ADD THIS NEW HOOK for random eye movement
    useEffect(() => {
        const interval = setInterval(() => {
            // Create a random target for the eyes to look at
            // These values determine the range of motion. Adjust as needed.
            const targetX = Math.random() * 0.5 - 0.1; // Look left/right
            const targetY = Math.random() * 0.1 - 0.05; // Look up/down
            setEyeTarget(new THREE.Vector2(targetX, targetY));
        }, 3000); // Change gaze every 3 seconds

        return () => clearInterval(interval);
    }, []);

    // Loop di animazione, eseguito ad ogni frame
    useFrame((state) => {
        const head = nodes.Head_Mesh001;
        const teeth = nodes.Teeth_Mesh001;
        const tongue = nodes.Tongue_Mesh001;
        const eyeAO = nodes.EyeAO_Mesh001;

        if (!head?.morphTargetDictionary || !teeth?.morphTargetDictionary || !tongue?.morphTargetDictionary || !eyeAO?.morphTargetDictionary) {
            return;
        }

        const lipSyncMeshes = [head, teeth, tongue];
        const expressionMeshes = [head, eyeAO];

        // FASE 1: Resetta le influenze
        lipSyncMeshes.forEach(mesh => {
            if (!mesh.morphTargetInfluences) return;
            Object.keys(mesh.morphTargetDictionary).forEach(key => {
                const index = mesh.morphTargetDictionary[key];
                mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[index], 0, morphTargetSmoothing);

                // --- THIS IS THE FIX ---
                // Add this 'if' condition to prevent the blink from being reset on the head every frame.
                if (key !== blinkLeftName && key !== blinkRightName) {
                    mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[index], 0, morphTargetSmoothing);
                }
            });
        });
        
        Object.keys(eyeAO.morphTargetDictionary).forEach(key => {
            if (key !== blinkLeftName && key !== blinkRightName) {
                const index = eyeAO.morphTargetDictionary[key];
                eyeAO.morphTargetInfluences[index] = THREE.MathUtils.lerp(eyeAO.morphTargetInfluences[index], 0, morphTargetSmoothing);
            }
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
                lipSyncMeshes.forEach(mesh => {
                    const morphIndex = mesh.morphTargetDictionary[visemeName];
                    if (morphIndex !== undefined) {
                        mesh.morphTargetInfluences[morphIndex] = 1;
                    }
                });

                // Anima occhi, sopracciglia e guance
                const expression = visemeToFacialExpressionMap[currentViseme.visemeId];
                if (expression) {
                    expressionMeshes.forEach(mesh => {
                        const dict = mesh.morphTargetDictionary;

                        // Occhi
                        if(expression.name){
                            const leftEyeIndex = dict[`${expression.name}Left`];
                            const rightEyeIndex = dict[`${expression.name}Right`];
                            if (leftEyeIndex !== undefined) mesh.morphTargetInfluences[leftEyeIndex] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[leftEyeIndex], expression.influence, morphTargetSmoothing);
                            if (rightEyeIndex !== undefined) mesh.morphTargetInfluences[rightEyeIndex] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[rightEyeIndex], expression.influence, morphTargetSmoothing);
                        }

                        // Sopracciglia
                        if (expression.browExpression) {
                            const browLeftIndex = dict[`${expression.browExpression}Left`];
                            const browRightIndex = dict[`${expression.browExpression}Right`];
                            if (browLeftIndex !== undefined) mesh.morphTargetInfluences[browLeftIndex] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[browLeftIndex], expression.browInfluence, morphTargetSmoothing);
                            if (browRightIndex !== undefined) mesh.morphTargetInfluences[browRightIndex] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[browRightIndex], expression.browInfluence, morphTargetSmoothing);
                        }

                        // Guance (solo su EyeAO_Mesh)
                        if (mesh.name.includes("EyeAO") && expression.cheekExpression) {
                             if (expression.cheekExpression === 'cheekPuff') {
                                const cheekPuffIndex = dict['cheekPuff'];
                                if (cheekPuffIndex !== undefined) {
                                    mesh.morphTargetInfluences[cheekPuffIndex] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[cheekPuffIndex], expression.cheekInfluence, morphTargetSmoothing);
                                }
                            } else if (expression.cheekExpression === 'cheekSquint') {
                                const cheekSquintLeftIndex = dict['cheekSquintLeft'];
                                const cheekSquintRightIndex = dict['cheekSquintRight'];
                                if (cheekSquintLeftIndex !== undefined) {
                                    mesh.morphTargetInfluences[cheekSquintLeftIndex] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[cheekSquintLeftIndex], expression.cheekInfluence, morphTargetSmoothing);
                                }
                                if (cheekSquintRightIndex !== undefined) {
                                    mesh.morphTargetInfluences[cheekSquintRightIndex] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[cheekSquintRightIndex], expression.cheekInfluence, morphTargetSmoothing);
                                }
                            }
                        }
                    });
                }
            }
        }
        
        // FASE 3: Applica un movimento sottile allo sguardo
        if (nodes.LeftEye && nodes.RightEye) {
            // const time = state.clock.getElapsedTime();
            // nodes.LeftEye.rotation.y = Math.sin(time * 0.5) * 0.08;
            // nodes.LeftEye.rotation.x = Math.cos(time * 0.3) * 0.05;
            // nodes.RightEye.rotation.y = Math.sin(time * 0.5) * 0.08;
            // nodes.RightEye.rotation.x = Math.cos(time * 0.3) * 0.05;

            // ADD a smooth interpolation (lerp) to the new target
            const lerpFactor = 0.05; // How quickly the eyes move to the target
            nodes.LeftEye.rotation.y = THREE.MathUtils.lerp(nodes.LeftEye.rotation.y, eyeTarget.x, lerpFactor);
            nodes.LeftEye.rotation.x = THREE.MathUtils.lerp(nodes.LeftEye.rotation.x, eyeTarget.y, lerpFactor);
            nodes.RightEye.rotation.y = THREE.MathUtils.lerp(nodes.RightEye.rotation.y, eyeTarget.x, lerpFactor);
            nodes.RightEye.rotation.x = THREE.MathUtils.lerp(nodes.RightEye.rotation.x, eyeTarget.y, lerpFactor);

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