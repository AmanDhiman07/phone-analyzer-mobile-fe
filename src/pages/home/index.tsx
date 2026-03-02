import { useHomeScreen } from "./hooks/useHomeScreen";
import { HomeView } from "./view/HomeView";

export default function HomePage() {
  const homeViewModel = useHomeScreen();
  return <HomeView {...homeViewModel} />;
}
