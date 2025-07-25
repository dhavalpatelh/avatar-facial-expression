import { Environment, OrbitControls, useTexture } from "@react-three/drei";
// import { useThree } from "@react-three/fiber";
// import { Avatar3 } from "./Avatar3";
//import { Avatar6} from "./Avatar6";
//import { Avatar7 } from "./Avatar7";
import { Avatar11 } from "./Avatar11";
export const Experience = () => {

  return (
    <>
      <OrbitControls />
      {/*<Avatar3 position={[0, -5, 5]}   scale={3} />*/}
      <Avatar11 position={[0, -5, 5]} scale={3} />
      <Environment preset="sunset" />
    </>
  );
};
