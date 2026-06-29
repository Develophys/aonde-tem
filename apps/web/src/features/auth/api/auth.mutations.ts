import { useMutation } from "@tanstack/react-query";
import { sendMagicCode, verifyMagicCode } from "./auth.api.js";
import { useAppStore } from "../../../app/store/index.js";

export function useSendMagicCode() {
  return useMutation({ mutationFn: sendMagicCode });
}

export function useVerifyMagicCode() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: verifyMagicCode,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}
