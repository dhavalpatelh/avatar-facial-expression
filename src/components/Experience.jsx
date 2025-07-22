import { Environment, OrbitControls, useTexture } from "@react-three/drei";
// import { useThree } from "@react-three/fiber";
// import { Avatar3 } from "./Avatar3";
import { Avatar5 } from "./Avatar5";

export const Experience = () => {

  return (
    <>
      <OrbitControls />
      {/*<Avatar3 position={[0, -5, 5]} scale={3} />*/}
      <Avatar5 position={[0, -5, 5]} scale={3} />
      <Environment preset="sunset" />
    </>
  );
};
