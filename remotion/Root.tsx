import { Composition } from "remotion";
import { AnimatedGrid } from "./components/Card";
import { RotaOnboarding } from "./compositions/RotaOnboarding";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RotaOnboarding"
        component={RotaOnboarding}
        durationInFrames={1410}
        component={RotaOnboarding}
        durationInFrames={1410} // 47 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
