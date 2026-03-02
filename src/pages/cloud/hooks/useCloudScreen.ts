import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  getAuthSession,
  type AuthSession,
} from "@/services/auth/sessionStorage";

export type CloudViewModel = {
  session: AuthSession | null;
  onOpenCloudHistory: () => void;
  onOpenLogin: () => void;
  onOpenHome: () => void;
};

export function useCloudScreen(): CloudViewModel {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAuthSession().then((value) => setSession(value));
    }, []),
  );

  const onOpenCloudHistory = useCallback(() => {
    router.push("/history?tab=cloud");
  }, [router]);

  const onOpenLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  const onOpenHome = useCallback(() => {
    router.push("/home");
  }, [router]);

  return {
    session,
    onOpenCloudHistory,
    onOpenLogin,
    onOpenHome,
  };
}
