import { useLoginScreen } from "./hooks/useLoginScreen";
import { LoginView } from "./view/LoginView";

export default function LoginPage() {
  const loginViewModel = useLoginScreen();
  return <LoginView {...loginViewModel} />;
}
