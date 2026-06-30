import { useMutation } from "@tanstack/react-query";
import {
  sendMagicCode,
  verifyMagicCode,
  loginWithPassword,
  completeRegistration,
} from "./auth.api.js";
import { useAppStore } from "../../../app/store/index.js";
import type { JwtResponse, RegistrationTokenResponse } from "@aonde-tem/contracts";

export function useSendMagicCode() {
  return useMutation({ mutationFn: sendMagicCode });
}

export function useVerifyMagicCode() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: verifyMagicCode,
    onSuccess: (data: JwtResponse | RegistrationTokenResponse) => {
      if ("registrationToken" in data) {
        // Registration flow: caller (SignUpPage) handles navigation.
      } else {
        // Full JWT flow: user has password.
        setSession(data.accessToken, data.user);
      }
    },
  });
}

export function useLoginWithPassword() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: loginWithPassword,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}

export function useCompleteRegistration() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: completeRegistration,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}
