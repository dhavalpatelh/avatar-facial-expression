/*
  This component is a modification of the original Avatar2.
  It removes audio-based lipsyncing and instead provides direct control
  over facial blend shapes and animations using Leva controls.
*/
import React, { useEffect, useMemo, useRef } from 'react';
import { useGraph } from '@react-three/fiber';
import { useGLTF, useAnimations, useFBX } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { useControls } from 'leva';
import * as THREE from 'three'; // Keep for potential future use, though not strictly needed now

export function Avatar3(props) {
    // --- 1. Leva Controls for Animations and Blend Shapes ---
    // We now control animation and individual morph targets via Leva.
    const { animation, ...morphTargetControls } = useControls({
        animation: {
            value: 'Idle',
            options: ['Idle', 'Greeting', 'Angry'],
        },
        // List of mouth blend shapes (visemes) for direct control.
        // Sliders go from 0 (neutral) to 1 (fully expressed).
        viseme_PP: { value: 0, min: 0, max: 1, label: 'Mouth: PP (Closed)' },
        viseme_kk: { value: 0, min: 0, max: 1, label: 'Mouth: kk (Clenched)' },
        viseme_I: { value: 0, min: 0, max: 1, label: 'Mouth: I (Smile)' },
        viseme_AA: { value: 0, min: 0, max: 1, label: 'Mouth: AA (Open)' },
        viseme_O: { value: 0, min: 0, max: 1, label: 'Mouth: O' },
        viseme_U: { value: 0, min: 0, max: 1, label: 'Mouth: U' },
        viseme_FF: { value: 0, min: 0, max: 1, label: 'Mouth: FF (Upper Lip)' },
        viseme_TH: { value: 0, min: 0, max: 1, label: 'Mouth: TH (Tongue Out)' },
        // Added a common blend shape for eyes.
        // The specific name 'eyeBlink' might differ based on your model.
        eyeBlinkLeft: { value: 0, min: 0, max: 1, label: 'Eyes: Left' },
        eyeBlinkRight: { value: 0, min: 0, max: 1, label: 'Eyes: Right' },
    });

    // --- 2. Model and Animation Loading ---
    const group = useRef();
    const { scene } = useGLTF('/models/fikrat-avatar-cut.glb');
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

    // Load FBX animations and assign names
    const { animations: idleAnimation } = useFBX('/animations/Idle.fbx');
    const { animations: angryAnimation } = useFBX('/animations/Angry Gesture.fbx');
    const { animations: greetingAnimation } = useFBX('/animations/Standing Greeting.fbx');

    idleAnimation[0].name = 'Idle';
    angryAnimation[0].name = 'Angry';
    greetingAnimation[0].name = 'Greeting';

    // Set up animation actions
    const { actions } = useAnimations(
        [idleAnimation[0], angryAnimation[0], greetingAnimation[0]],
        group
    );

    // --- 3. Animation Control Effect ---
    // This effect plays the animation selected in the Leva controls.
    useEffect(() => {
        actions[animation].reset().fadeIn(0.5).play();
        return () => actions[animation]?.fadeOut(0.5);
    }, [animation, actions]);


    // --- 4. Morph Target Control Effect ---
    // This effect applies the blend shape values from Leva to the model's face.
    // It runs whenever a slider is changed.
    useEffect(() => {
        // We iterate over the blend shapes controlled by Leva.
        Object.keys(morphTargetControls).forEach((key) => {
            const headMesh = nodes.Head_Mesh001;
            const teethMesh = nodes.Teeth_Mesh001;

            // Find the index of the morph target in the model's dictionary.
            const headIndex = headMesh.morphTargetDictionary[key];
            const teethIndex = teethMesh.morphTargetDictionary[key];

            // If the morph target exists on the head mesh, update its influence.
            if (headIndex !== undefined) {
                headMesh.morphTargetInfluences[headIndex] = morphTargetControls[key];
            }

            // If the morph target exists on the teeth mesh, update its influence.
            if (teethIndex !== undefined) {
                teethMesh.morphTargetInfluences[teethIndex] = morphTargetControls[key];
            }
        });
        // The dependency array ensures this runs only when slider values change.
    }, [morphTargetControls, nodes]);

    return (
        <group {...props} dispose={null} ref={group}>
            <group name="Scene">
                <group name="Armature">
                    <primitive object={nodes.Hips} />
                    {/* Empty groups are kept for structure, can be removed if not needed */}
                    <group name="Eye_Mesh" />
                    <group name="EyeAO_Mesh" />
                    <group name="Eyelash_Mesh" />
                    <group name="Head_Mesh" />
                    <group name="Teeth_Mesh" />
                    <group name="Tongue_Mesh" />
                    {/* The SkinnedMesh components are the visible parts of the avatar */}
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

// Preload the model for faster initial rendering
useGLTF.preload('/models/fikrat-avatar-cut.glb');