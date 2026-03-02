import { useCloudScreen } from "./hooks/useCloudScreen";
import { CloudView } from "./view/CloudView";

export default function CloudPage() {
  const cloudViewModel = useCloudScreen();
  return <CloudView {...cloudViewModel} />;
}
